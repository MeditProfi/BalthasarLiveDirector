#!/usr/bin/perl -w
#
# This file is part of VIDI Playout BalthasarLive Director.
#
# VIDI Playout BalthasarLive Director is free software: you can redistribute it
# and/or modify it under the terms of the GNU General Public License as
# published by the Free Software Foundation, either version 3 of the License,
# or (at your option) any later version.
#
# VIDI Playout BalthasarLive Director is distributed in the hope that it will
# be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General
# Public License for more details.
#
# You should have received a copy of the GNU General Public License along with
# VIDI Playout BalthasarLive Director. If not, see <http://www.gnu.org/licenses/>.
#
use strict;
use warnings;
use utf8;

use POSIX qw(setsid);
use Time::HiRes qw( time usleep );
use Fcntl qw(:flock);
use Data::Dumper;

use IO::Socket::UNIX qw( SOCK_STREAM SOMAXCONN );
use IO::Select;
use Getopt::Long;
use Storable qw( dclone );

use FindBin;
use lib "$FindBin::Bin/lib";
use VIDI::Flock qw(:all);

use AMCP;
use BtlCtl::Common qw( JSONencode JSONdecode GetUpdateFillEngineCommands );
use BtlCtl::DB;

# init
my $KEEP_RUNNING = 1;
my $SIGNAL;
my $VERBOSE = 0;

my $CONFIG_FILE = $ENV{BTLCTL_CONFIG} // $FindBin::Bin."/btlctl.config.json";
my %CONFIG = BtlCtl::Common::ReadConfig( $CONFIG_FILE );
my $DATA_DIR = $CONFIG{'data_dir'} // "$FindBin::Bin/data";
my $LOG;
my $LOG_LEVEL;
my %BTL_STATUS = ();
my %FILL_ENGINES = ();

GetOptions(
    "verbose|v"       => \$VERBOSE,
    "config|c=s"      => \$CONFIG_FILE,
    "loglevel=s"      => \$LOG_LEVEL,
) or usage(1);

init_log();

for my $type (qw( template_engines fill_engines )) {
    for my $server_config ( @{$CONFIG{$type}} ) {
        my $btl =  dclone($server_config);
        $btl->{DB}   = BtlCtl::DB->new( DATA_DIR => $DATA_DIR, name => $btl->{id} );
        $btl->{AMCP} = AMCP->new( host => $btl->{host}, port => $btl->{port}, log => $LOG );
        ($btl->{TYPE} = uc($type)) =~ s/_engines$//i; # set $btl->{TYPE} = 'TEMPLATE' || 'FILL';
        $BTL_STATUS{ $btl->{id} } = $btl;
    }
}

for my $btl ( values %BTL_STATUS ) {
    my $data = $btl->{DB}->GetData( 'inited' );
    $LOG->info("BCL0100I ".sprintf("%s data = %s", $btl->{id}, JSONencode( $data )));
}

#print "Number of current threads: " . threads->list() . "\n";
$SIG{INT} = $SIG{TERM} = $SIG{HUP} = \&signal_handler;
$SIG{PIPE} = 'IGNORE';
for my $i ( 35 .. 63 ) {
    $SIG{"NUM$i"} = \&SIGNUM_handler;
}
$SIG{"USR1"} = $SIG{"USR2"} = \&SIGNUM_handler;

for my $btl ( values %BTL_STATUS ) {
    start_AMCP_client_fork( $btl );
}


exit 0;

sub init_log {
    $LOG_LEVEL //= $CONFIG{global}->{loglevel};
    $LOG = BtlCtl::Common::InitLog( logfile => $CONFIG{global}->{logfilename}, loglevel => $LOG_LEVEL, verbose => $VERBOSE );
    $LOG->info("BCL0010I starting btlctl v0.9.5");
}

sub start_AMCP_client_fork {
    my( $btl ) = @_;

    my $pid = fork();
    die "fork() failed: $!" unless defined $pid;
    if( $pid ) { # parent
        $btl->{worker_pid} = $pid;
        return $pid;
    }
    else { # child
        if(!setsid()) {
       	    $LOG->error("BCL0101E Can't start a new session: $!");
            exit 1;
        }
        $0 .= " ".$btl->{id}." [".$btl->{TYPE}."]";
        lock_pid_file_or_die( $btl );

        return AMCP_client_worker( $btl );
    }
}

sub lock_pid_file_or_die {
    my( $btl ) = @_;

    my $pid_file = $btl->{pid_file} // $FindBin::Bin."/".$btl->{id}.".pid";
    $btl->{pid_file} = $pid_file;
    local(*LOCK);
	my $create = ( ! -r $pid_file );
	my $open_name = $create ? '+>' : '+<';
    $open_name .= $pid_file;
	if( open(LOCK, $open_name) ) {
		unless(vflock( *LOCK, LOCK_EX | LOCK_NB ) ) {
			print STDERR "$0: ERROR Cannot lock pid-file\n";
			exit 1;
		}
        my $old_fh = select(LOCK); $| = 1; select($old_fh);
		seek(LOCK,0,0);
		print LOCK $$, "\n";
	}
	$btl->{'_LOCK'} = *LOCK;
}

sub AMCP_client_worker {
    # Retrieve the current thread ID:
    my $PID = $$;

    my( $btl ) = @_;
    my $btl_connected = 0;
    my $is_FILL_btl   = ($btl->{TYPE} eq 'FILL');
    my( $is_FILL_btl_updated, $fill_update_delay ) = ( 0, 3 );

    my $listener = create_and_bind_unix_domain_socket( $btl );
    my $accept_select = IO::Select->new();
    $accept_select->add($listener);
    my $client_select = IO::Select->new();

    my( $last_update, $last_connect ) = ( 0, 0 );
    my( $update_interval, $connect_interval ) = ( 1.0, 1.0 );

    while( $KEEP_RUNNING )
    {
        my $time = time();
        unless( $btl_connected )
        {
            if( ($time - $last_connect) > $connect_interval ) {
                $last_connect = $time;
                $btl_connected = $btl->{AMCP}->Connect();
                if( $btl_connected ) {
                    my $templates = $btl->{AMCP}->DATA_RETRIEVE_TEMPLATES_LIST();
                    $LOG->info("BCL0130I templates_list $btl->{id} : ".JSONencode($templates) );
                    $btl->{DB}->SetData( %$templates );
                    $btl->{DB}->SetData( ONLINE => 1 );
                    $LOG->info("BCL0111I ".sprintf("%s ONLINE = 1", $btl->{id}));
                }
                else {
                    my $data = $btl->{DB}->GetData( 'ONLINE' );
                    $LOG->info("BCL0112I ".sprintf("%s ONLINE = 0", $btl->{id})) if( $data->{ONLINE} );
                    $btl->{DB}->SetData( ONLINE => 0 );
                }
            }
        }

        my @accept = $accept_select->can_read(0);
        foreach my $accept ( @accept ) {
            if( $accept == $listener ) {
                my $client_connection = $accept->accept();
                $client_select->add( $client_connection );
                $LOG->info("BCL0310I accepted client connection $client_connection");
            }
        }
        my @read = $client_select->can_read(0);
        foreach my $read ( @read ) {
            my $recv_buffer = q();
            $read->recv($recv_buffer, 1024, 0);
            my $count = length( $recv_buffer );
            unless( $count ) {
                $read->close();
                $client_select->remove( $read );
                $LOG->info("BCL0330I client $read disconnected");
                next;
            }
            if( $recv_buffer =~ /^\s+$/ ) {
                $LOG->info("BCL0340I recieved space-only message from cleint $read");
                next;
            }
            (my $log_cmd = $recv_buffer) =~ s/\r?\n/\\r\\n/g;
            $LOG->info("BCL0320I recieved $count bytes from cleint ($log_cmd)");
            if( $btl_connected ) {
                my $result = $btl->{AMCP}->Cmd( $recv_buffer );
                if( $read->connected() ) {
                    if( $result ) {
                        $read->write( $result );
                        $result =~ s/\r/\\r/g; $result =~ s/\n/\\n/g;
                        $LOG->info("BCL0350I written $result back to client");
                        $fill_update_delay = 3 if( $is_FILL_btl );
                    }
                    else {
                        $read->write( "400 ERROR TIMEOUT\r\n" );
                        $LOG->info("BCL0360I written 'ERROR' back to client");
                    }
                }
            }
            else {
                $read->write( "500 NOT CONNECTED\r\n" );
            }
        }
        if( time() - $last_update < $update_interval ) {
            #usleep(20000); #sleep half of frame (20 ms)
            usleep(40000); #sleep one frame (40 ms)
            next;
        }
        #my @layers = qw(2-4 2-8 1-1 1-2 1-3 1-6);
        #my $info = $btl->{AMCP}->INFO_LAYERS( @layers );
        my $info = $btl->{AMCP}->DATA_RETRIEVE_ALL( 'baltasar' );
        if( $info ) {
            $LOG->info("BCL0120I get info from $btl->{id} : ".JSONencode($info) );
            $btl->{DB}->SetData( %$info );
            $last_update = time();
            $btl->{DB}->SetData( 'timestamp' => $last_update );
        }
        else {
            $btl_connected = 0;
        }

        $fill_update_delay-- if $fill_update_delay;
        if( $btl_connected && $btl->{TYPE} eq 'FILL' && !$fill_update_delay )
        {
            my $commands = GetUpdateFillEngineCommands(\%CONFIG, \%BTL_STATUS);
            for my $cmd ( @$commands ) {
                $LOG->info(sprintf("BCL0150I %s > CMD: %s", $btl->{id}, $cmd));
                my $result = $btl->{AMCP}->Cmd( $cmd );
                if( $result !~ /^20\d/ ) {
                    $LOG->error(sprintf("BCL0155E %s ERROR: %s", $btl->{id}, $result));
                }
                else {
                    $LOG->debug(sprintf("BCL0160D %s RESULT: %s", $btl->{id}, $result));
                }
            }
        }
    }
    if( !$KEEP_RUNNING ) {
        $btl->{DB}->SetData( ONLINE => 0 );
        $LOG->notice("BCL0210N Graceful shutdown");
    }
    exit 0;
}

sub create_and_bind_unix_domain_socket {
    my( $btl ) = @_;

    my $socket_path = $btl->{socket_path} // $FindBin::Bin."/".$btl->{id}.".sock";
    unlink($socket_path);

    umask 0;
    my $listener = IO::Socket::UNIX->new(
        Type   => SOCK_STREAM,
        Local  => $socket_path,
        Listen => SOMAXCONN,
    )
    or die("Can't create server socket: $!\n");
    chmod 0777, $socket_path;

    $btl->{socket_listener} = $listener;
    return $listener;
}

sub signal_handler {
    my( $signame, @args ) = @_;
    $LOG->notice("BCL0700N somebody sent me a SIG$signame");
    $SIGNAL = $signame;
    $KEEP_RUNNING = 0;
}

sub SIGNUM_handler {
    my( $signal, @args ) = @_;
    if( $signal =~ /^NUM(35|36|37|38|39|40)$/
     || $signal =~ /^USR(1|2)$/
    ) {
        $LOG->info("BCL0300I somebody sent me a SIG$signal");
        if( $signal eq 'USR1' ) { # rotate log
            undef $LOG;
            init_log();
        }
    }
}

sub usage {
    my $exitcode = shift;
    print STDERR "Usage:\n$0 [-v] [-c config.json]\n\n";
    exit $exitcode;
}

