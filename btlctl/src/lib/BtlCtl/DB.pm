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
package BtlCtl::DB;
use strict;
use warnings;

use MLDBM::VIDISync;
use MLDBM qw( MLDBM::Sync::SDBM_File Storable );
use Fcntl qw( :DEFAULT :flock );

sub new {
    my( $proto, %args ) = ( shift, @_ );
    my $class = ref($proto) || $proto;
    
    my $name     = $args{name};
    my $DATA_DIR = $args{DATA_DIR};
    my $filename = sprintf("%s/%s.MLDBM", $DATA_DIR, $name);
    my $self = {
        'filename' => $filename,
        'LOG'      => $args{LOG} // undef,
    };

    _init_MLDBM_file( $self );

    bless($self, $class);
    return $self;
}

sub _init_MLDBM_file {
    my( $self ) = @_;
    $self->{DB} =  $self->{hDB} = {};
    
    my $filename = $self->{filename};
    eval {
        umask 0;
        if( -e "$filename.dir" && -e "$filename.pag" ) {
            $self->{hDB} = tie %{$self->{DB}}, 'MLDBM::VIDISync', $filename, O_RDWR, 0666;
        }
        else {
            $self->{hDB} = tie %{$self->{DB}}, 'MLDBM::VIDISync', $filename, O_CREAT|O_RDWR, 0666;
            SetData( $self, 'inited' => 1 );
        }
    }; if( $@ ) {
        $self->{LOG}->error("$@") if defined $self->{LOG};
    }
    return $self;
}

sub GetData {
    my( $self, @keys ) = @_;
    my %data = ();
    $self->{hDB}->ReadLock;
    for( @keys ) {
        $data{$_} = exists $self->{DB}->{$_} ? $self->{DB}->{$_} : undef;
    }
    $self->{hDB}->UnLock;
    return \%data;
}

sub SetData {
    my( $self, %data ) = @_;
    $self->{hDB}->Lock;
    for( keys %data ) {
        $self->{DB}->{$_} = $data{$_};
    }
    $self->{hDB}->UnLock;
}


1;

