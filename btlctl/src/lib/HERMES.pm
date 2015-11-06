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
package HERMES;
use strict;
use warnings;

use LWP::UserAgent;

sub new {
    my( $proto, %args ) = ( shift, @_ );
    my $class = ref($proto) || $proto;
    die sprintf("Cannot create %s object: host/port parameters not specified", __PACKAGE__)
        unless( $args{host} && $args{port} );

    my $self = {};
    $self->{$_} = $args{$_} for( keys %args );
    $self->{commands} //= {};
    $self->{_UA} = LWP::UserAgent->new;

    bless($self, $class);
    return $self;
}

sub CMD {
    my( $self, $cmd_id ) = @_;
    my $cmd = defined $self->{commands}{$cmd_id} ? $self->{commands}{$cmd_id}
            :                                      $cmd_id;
    my $url = $self->_get_request_url( $cmd );
    my $req = HTTP::Request->new(GET => $url);
    my $res = $self->{_UA}->request( $req );
    if( $res->is_success ) {
        return $res->decoded_content;
    }
    #print STDERR $res->status_line, "\n" if $self->VERBOSE;
    return $res->status_line;
}

sub _get_request_url {
    my( $self, $cmd ) = @_;
    return sprintf q(%s://%s/%s),
           $self->{https} ? 'https' : 'http',
           $self->{host}.":".$self->{port},
           (defined($cmd) && $cmd) ? $cmd : q(),
           ;
}


1;
