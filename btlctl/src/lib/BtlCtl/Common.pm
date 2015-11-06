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
package BtlCtl::Common;
use strict;
use warnings;
use utf8;
use base qw(Exporter);
use vars qw( @EXPORT @EXPORT_OK %EXPORT_TAGS );

use File::Basename;
use JSON::XS;
use Time::HiRes;

use Log::Handler;
use Log::Handler::Output::Screen;
use Log::Handler::Output::File;

use constant DEFAULT_LOG_LEVEL => 'debug';
my $JSON;
my $LOG;

BEGIN {
    $JSON = new JSON::XS(); $JSON->allow_nonref;

    @EXPORT_OK   = qw( InitLog
                       ReadConfig
                       JSONencode JSONdecode
                       GetUpdateFillEngineCommands
                       GetActiveLiveStreams GetFillEngineStreams
                       GetLiveStreamsFromInputData
                     );
    %EXPORT_TAGS = ( all => \@EXPORT_OK );
    @EXPORT      = @EXPORT_OK;
}

sub InitLog
{
    my( %args ) = @_;
    my $logfile = $args{logfile};
    my $loglevel= $args{loglevel};
    my $VERBOSE = $args{verbose};
    my $logname = basename( $0 );
    my $LOG_L   = defined($loglevel) ? $loglevel : DEFAULT_LOG_LEVEL;
    my $LOG_FH  = $logfile // "$FindBin::Bin/$logname.log";

	$LOG = Log::Handler->new();
    $LOG->set_pattern("%x", "hires_milliseconds", sub { my $t = Time::HiRes::time(); return substr(sprintf("%0.3f", ($t-int($t))), 2); });
    if( $VERBOSE ) {
        $LOG->add(
            screen => {
                log_to => 'STDERR',
                utf8 => 1,
                minlevel => 'critical',
                maxlevel => $LOG_L,
                timeformat => '%d.%m.%Y %H:%M:%S',
                #message_layout => "%T %P [%L] %m (%C)",
                message_layout => "%T.%x %P [%L] %m",
                newline	=> 1,
                #prefix	=> "$$ ",
                alias => 'LOG',
            }
        );
    }
	if( $LOG_FH ne 'STDERR' ) {
		$LOG->add(
			file => {
				filename => $LOG_FH,
				utf8 => 1,
				minlevel => 'critical',
				maxlevel => $LOG_L,
				mode	=> 'append',
				fileopen => 0,
				reopen	=> 0,
				timeformat => '%d.%m.%Y %H:%M:%S',
                message_layout => "%T.%x %P [%L] %m",
				newline	=> 1,
                #prefix	=> "$$ ",
				alias => 'LOG',
			}
		);
	}
    return $LOG;
}

sub ReadConfig
{
    my( $json_file ) = @_;
    open(F, "<", $json_file) || die "Cannot open config file $json_file";
    my @config = <F>;
    close(F);
    my $config = undef;
    eval {
        $config = JSONdecode( join(q(), @config) );
    }; if( $@ ) {
        print STDERR $@;
        die "Cannot parse config file $json_file: $@";
    }
    return %$config;
}

sub JSONencode
{
    my $str = shift;
    return $JSON->encode( $str );
}

sub JSONdecode
{
    my $str = shift;
    return defined( $str ) ? $JSON->decode( $str )
          :                  undef;
}

sub GetLiveStreamsFromInputData {
    my( $id, $INPUT ) = @_;
    my %streams = ();
    return \%streams unless ref($INPUT) eq 'HASH';

    for my $k ( sort grep { $_ =~ /^INPUT\d/i } keys %$INPUT ) {
       my $input = $INPUT->{$k};
       next if( $input->{URL} =~ /^(none|decklink)/i );
       (my $channel = $k) =~ s/^\D+//;
       (my $url = $input->{URL}) =~ s/delay\s+\d+//i; $url =~ s/\s*$//;
       $streams{ $url } = { 'input' => $channel, id => $id };
       $LOG->debug(sprintf("BCL1450D stream $k $input->{URL}"));
    }
    return \%streams;
}

sub GetActiveLiveStreams {
    my( $CONFIG, $BTL_STATUS ) = @_;
    my $streams = {};
    for my $server ( @{$CONFIG->{template_engines}} ) {
        my $btl = $BTL_STATUS->{ $server->{id} };
        my $data = $btl->{DB}->GetData('INPUT');
        my $server_streams = GetLiveStreamsFromInputData($btl->{id}, $data->{INPUT});
        for( keys %$server_streams ) {
            unless( exists $streams->{$_} ) {
                $streams->{$_} = $server_streams->{$_};
                next;
            }
            $streams->{$_} = [ $streams->{$_} ];
            push @{$streams->{$_}}, $server_streams->{$_};
        }
    }
    return $streams;
}

sub GetFillEngineStreams {
    my( $CONFIG, $BTL_STATUS ) = @_;
    my $streams = {};
    for my $server ( @{$CONFIG->{fill_engines}} ) {
        my $btl = $BTL_STATUS->{ $server->{id} };
        my $data = $btl->{DB}->GetData('INPUT');
        my $server_streams = GetLiveStreamsFromInputData($btl->{id}, $data->{INPUT});
        $streams->{$_} = $server_streams->{$_} for( keys %$server_streams );
    }
    return $streams;
}

sub GetUpdateFillEngineCommands {
    my( $CONFIG, $BTL_STATUS, %args ) = @_;

    my $id            = $args{id}      // 0;
    my $current_input = $args{channel} // 0;
    my $input         = $args{input}   // q();
    my $clear         = $args{clear}   // 0;

    my $active_streams = GetActiveLiveStreams($CONFIG, $BTL_STATUS);
    my %replaced_streams = ();
    for my $url ( sort keys %$active_streams ) {
        my $stream = $active_streams->{$url};
        my @streams = (ref($stream) eq 'ARRAY') ? @$stream : ( $stream );
        my $stop_count = 0;
        for my $s ( @streams ) {
            next unless( $s->{id} eq $id && ($clear || $s->{input} eq $current_input) );
            $stop_count++;
        }
        if( $stop_count == scalar(@streams) ){
            $replaced_streams{ $url } = 1;
        }
    }
    delete $active_streams->{$_} for( keys %replaced_streams );

    $active_streams->{ $input } = { id => $id, input => $current_input }
        if( $input && $input !~ /^decklink/i );
    for my $url ( sort keys %$active_streams ) {
        $LOG->info(sprintf("BCL1400I current active LIVE streams: %s", $url));
    }

    my $fill_streams = GetFillEngineStreams($CONFIG, $BTL_STATUS);
    my %streams_to_stop = ();
    for my $url ( keys %$fill_streams ) {
        next if(exists $active_streams->{$url});
        $streams_to_stop{ $url } = $fill_streams->{$url};
        $LOG->info(sprintf("BCL1420I stream to stop on FILL: %s", $url));
    }

    my %active_fill_channels = ();
    for my $url ( keys %$fill_streams ) {
        next if exists($streams_to_stop{ $url });
        $active_fill_channels{ $fill_streams->{$url}{input} } = $url;
    }

    my $fill_btl      = $BTL_STATUS->{ $CONFIG->{fill_engines}->[0]->{id} };
    my $fill_channels = $fill_btl->{channels};
    my @empty_fill_channels = ();
    for my $i ( 1 .. $fill_channels ) {
        next if exists( $active_fill_channels{ $i } );
        push @empty_fill_channels, $i;
    }

    my %streams_to_start = ();
    for my $url ( keys %$active_streams ) {
        next if(exists $fill_streams->{$url});
        my $channel = shift( @empty_fill_channels );
        if( $channel ) {
            $streams_to_start{ $url } = $channel;
            $LOG->info(sprintf("BCL1410I stream to start on FILL(channel %d): %s", $channel, $url));
            next;
        }
        $LOG->info(sprintf("BCL1430I Cannot start stream %s on FILL: no inputs available", $url));
    }
    if( ! $fill_btl->{DB}->GetData('ONLINE')->{'ONLINE'} ) {
        $LOG->info(sprintf("BCL1440E ERROR: %s is OFFLINE", $fill_btl->{id}));
        return q();
    }

    my @commands = ();
    for my $url ( keys %streams_to_stop ) {
        my $stream = $streams_to_stop{ $url };
        my $channel = $stream->{input};
        my $cmd = sprintf("MACRO audio STOP%d\r\n\r\n", $channel);
        push @commands, $cmd;
        #my $error = send_command( $fill_btl, $cmd );
    }
    for my $url ( keys %streams_to_start ) {
        my $channel = $streams_to_start{ $url };
        my $cmd = sprintf(qq|MACRO audio INPUT%d "%s"\r\n\r\n|, $channel, $url);
        #my $error = send_command( $fill_btl, $cmd );
        push @commands, $cmd;
    }
    return \@commands;
}


1;
