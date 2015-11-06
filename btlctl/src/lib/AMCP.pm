#!/usr/bin/env perl -w
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
package AMCP;

use strict;
use warnings;

use IO::Socket::INET;
use IO::Select;
use XML::LibXML;
use Encode;
use constant TIMEOUT => 3;

sub new {
    my( $proto, %args ) = ( shift, @_ );
    my $class = ref($proto) || $proto;

    my $self = {};
    $self->{$_} = $args{$_} for( keys %args ); 

    $self->{xmlParser} = XML::LibXML->new();

    bless($self, $class);
    return $self;
}
sub Connect {
    my( $self ) = @_;
    my ($result, $error) = $self->_timeout_call( TIMEOUT, '_Connect' );
    if( $error eq 'timeout' ) {
    }
    return $result;
}

sub Disconnect {
    my( $self ) = @_;
    $self->{socket} = undef;
    $self->{socket_sel} = undef;
}

sub Cmd {
    my( $self, $cmd, @args ) = @_;
    if( $self->{socket} ) {
		while ($self->{socket_sel}->can_read(0)) {
		    my $trash; $self->{socket}->recv($trash, 10240);
		    last unless length($trash);
            $self->print_log('debug', "skip some data from soket ($self->{host}:$self->{port}):" . length($trash));
		}
        my $cmd = sprintf( $cmd, @args );
        $cmd =~ s/(\r?\n){0,2}$/\r\n\r\n/;
        my $size = 0;
        eval {
            $size = $self->{socket}->send( $cmd );
        };
        if( $@ || !$size ) {
            $self->print_log('error', "send error: $@");
            $self->Disconnect();
            return 0;
        }
        #$self->print_log('debug', "sent CMD of length $size");
        (my $log_cmd = $cmd) =~ s/\r\n/\\r\\n/g;
        #$self->print_log('debug', "CMD = $log_cmd");
        my $response = "";
        $self->{socket}->recv($response, 10240);
        return decode('utf-8', $response);
    }
    else {
        return 0;
    }
}

sub INFO_LAYERS {
    my( $self, @layers ) = @_;
    my $layers_str = join(' ', @layers);
    my $res = $self->Cmd("INFO LAYERS $layers_str");
    if( $res && $res =~ s/^20\d INFO OK\r?\n// ) {
        $res =~ s/^(<\?xml.*\?>\r?\n)(.*)/$1<layers>\r\n$2/;
        $res =~ s/(.*<\/layer>\r?\n)(\r?\n)$/$1<\/layers>\r\n$2/;
        eval {
            my $info = $self->ParseCasparXML( $res );
            return $info;
        };
        if( $@ ) {
           $self->print_log('error', "BCL0124E $@"); 
           $self->print_log('error', "BCL0125E get info from $self->{host} : $res") if( $res );
        }
    }
    return undef;
}

sub DATA_RETRIEVE_ALL {
    my( $self, $id ) = @_;
    my $res = $self->Cmd("DATA RETRIEVE_ALL $id");
    my $info = undef;
    if( $res && $res =~ s/^20\d DATA RETRIEVE_ALL OK\r?\n// ) {
        eval {
            my $doc = $self->ParseCasparXML( $res );
            if( $doc ) {
                $info = { INPUT => {} };
                for my $node ( $doc->findnodes('/data/*') ) {
                    if( uc($node->tagName) eq 'INPUT' ) {
                        for my $input ( $node->childNodes() ) {
                            next if( ref($input) eq 'XML::LibXML::Text' );
                            $info->{INPUT}{$input->tagName} = {};
                            for my $input_info ( $input->childNodes() ) {
                                next if( ref($input_info) eq 'XML::LibXML::Text' );
                                $info->{INPUT}{$input->tagName}{$input_info->tagName} = $input_info->to_literal;
                            }
                        }
                        next;
                    }
                    $info->{ $node->tagName } = $node->to_literal;
                }
            }
            #$self->print_log('debug', "RETRIEVE_ALL = ".Data::Dumper->Dump([ $info ]));
        };
        if( $@ ) {
           $self->print_log('error', "BCL0134E $@"); 
           $self->print_log('error', "BCL0135E get info from $self->{host} : $res") if( $res );
        }
    }
    return $info;
}

sub DATA_RETRIEVE {
    my( $self, $id ) = @_;
    my $info = undef;
    my $res = $self->Cmd("DATA RETRIEVE $id");
    if( $res && $res =~ s/^20\d DATA RETRIEVE OK\r?\n// ) {
        eval {
            $info = $self->ParseCasparXML( $res );
        };
        if( $@ ) {
           $self->print_log('error', "BCL0144E $@"); 
           $self->print_log('error', "BCL0145E get info from $self->{host} : $res") if( $res );
        }
    }
    return $info;
}

sub DATA_RETRIEVE_TEMPLATES_LIST {
    my( $self, $id ) = @_;
    my $info = {};
    my $doc = $self->DATA_RETRIEVE( 'templates_list' );
    if( $doc ) {
        my @templates = ();
        for my $tmpl_node ( $doc->findnodes('/templates/template') ) {
            #$self->print_log('debug', "RETRIEVE $id ".$tmpl_node);
            my $template = {};
            for my $tmpl_data ( $tmpl_node->childNodes() ) {
                next if( ref($tmpl_data) eq 'XML::LibXML::Text' );
                if( lc($tmpl_data->tagName) eq 'actions' ) {
                    $template->{actions} = {};
                    for my $action ( $tmpl_data->childNodes() ) {
                        next if( ref($action) eq 'XML::LibXML::Text' );
                        my @attrs = $action->attributes;
                        my @ids = map { $_->getValue } grep { $_->nodeName eq 'id' } @attrs;
                        my $id = shift @ids;
                        $template->{actions}{$id} = 1;
                    }
                    next;
                }
                $template->{ lc($tmpl_data->tagName) } = $tmpl_data->to_literal;
            }
            push @templates, $template;
        }
        $info->{ templates } = \@templates;
    }
    #$self->print_log('debug', "RETRIEVE = ".Data::Dumper->Dump([ $info ]));
    return $info;
}

####################################################################################################
sub print_log {
    my( $self, $level, $msg ) = @_;
    return unless defined $self->{log};
    return ($level eq 'error') ? $self->{log}->error(   $msg )
          :($level eq 'debug') ? $self->{log}->debug(   $msg )
          :($level eq 'warn' ) ? $self->{log}->warning( $msg )
          :                      $self->{log}->info(    $msg )
          ;
}

sub _timeout_call {
    my( $self, $timeout, $method, @args ) = @_;
    my $alarm = 0;
    my $result;
    my $error = q();
    eval
    {
        eval {
           local $SIG{ALRM} = sub { die "alarm\n" };
           alarm( $timeout );
           $result = $self->$method( $self, @args );
           alarm(0);
        };
        alarm(0);
        if ($@) {
           die unless $@ eq "alarm\n";   # propagate unexpected errors
           $alarm = 1;
        }
    };
    if( $@ or $alarm ) {
        $self->Disconnect();
        (my $err = $@) =~ s/\n/ /g;
        $self->print_log('error',sprintf("Call to %s::%s was interrupted by timeout (%d sec). %s", __PACKAGE__, $method, $timeout, $err)) if( $alarm );
        $self->print_log('error',sprintf("Call to %s::%s died with error: %s", __PACKAGE__, $method, $err)) unless( $alarm );
        $error = $alarm ? 'timeout'
               : $err   ? $err
               :          q();
    }
    return wantarray ? ( $result, $error ) : $result;
}

sub _Connect {
    my( $self ) = @_;
    $self->print_log('info', sprintf("Connecting to %s:%s", $self->{host}, $self->{port}));
    my $s = new IO::Socket::INET(sprintf("%s:%s", $self->{host}, $self->{port}))
        or die sprintf("Couldn't connect to %s:%s: %s", $self->{host}, $self->{port}, $!);
    $self->print_log('info', sprintf("Connected to %s:%s, Sending request...", $self->{host}, $self->{port}));
    #$self->print_log('debug', "socket = $s");

    # data to send to a server
    my $req = "INFO SERVER\r\n\r\n";
    my $size = $s->send($req);
    $self->print_log('debug', "sent data of length $size");
 
    # receive a response of up to 1024 characters from server
    my $response = "";
    $s->recv($response, 10240);
    if( $response =~ /^201 INFO SERVER OK/ ) {
        $self->print_log('debug', substr($response, 0, index($response, "\r\n")));
        $self->{socket} = $s;
        $self->{socket_sel} = IO::Select->new($s);
        return 1;
    }
    else {
        $s->close();
    }
    return 0;
}

sub ParseCasparXML {
    my( $self, $responseText ) = @_;
    my $ref = $self->{xmlParser}->parse_string( encode('utf-8', $responseText) );
    return $ref;
}


1;
