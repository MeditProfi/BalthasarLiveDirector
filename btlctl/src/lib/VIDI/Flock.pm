package VIDI::Flock;

use 5.008003;
use strict;
use warnings;
use Carp;

require Exporter;
use AutoLoader;

our @ISA = qw(Exporter);

# Items to export into callers namespace by default. Note: do not export
# names by default without a very good reason. Use EXPORT_OK instead.
# Do not simply export all your public functions/methods/constants.

# This allows declaration	use VIDI::Flock ':all';
# If you do not need this, moving things directly into @EXPORT or @EXPORT_OK
# will save memory.
our %EXPORT_TAGS = ( 'all' => [ qw(
	vflock
) ] );

our @EXPORT_OK = ( @{ $EXPORT_TAGS{'all'} } );

our @EXPORT = qw(
	
);

our $VERSION = '0.01';

sub AUTOLOAD {
    # This AUTOLOAD is used to 'autoload' constants from the constant()
    # XS function.

    my $constname;
    our $AUTOLOAD;
    ($constname = $AUTOLOAD) =~ s/.*:://;
    croak "&VIDI::Flock::constant not defined" if $constname eq 'constant';
    my ($error, $val) = constant($constname);
    if ($error) { croak $error; }
    {
	no strict 'refs';
	# Fixed between 5.005_53 and 5.005_61
#XXX	if ($] >= 5.00561) {
#XXX	    *$AUTOLOAD = sub () { $val };
#XXX	}
#XXX	else {
	    *$AUTOLOAD = sub { $val };
#XXX	}
    }
    goto &$AUTOLOAD;
}

require XSLoader;
XSLoader::load('VIDI::Flock', $VERSION);

# Preloaded methods go here.

# Autoload methods go after =cut, and are processed by the autosplit program.

1;
__END__
# Below is stub documentation for your module. You'd better edit it!

=head1 NAME

VIDI::Flock - Perl extension for file locking

=head1 SYNOPSIS

  use VIDI::Flock;
  use VIDI::Flock qw ( vflock )

=head1 DESCRIPTION

This module provides function "vflock" that resemble standart "flock"
function, but uses fcntl (on *nix) or LockFileEx (on win32) to lock
files. Thus it can be used to lock files over NFS, GPFS and other filesystems
that do not support GNU C library "flock" call.

=head2 EXPORT

None by default.

=head1 SEE ALSO

Nothing yet

=head1 AUTHOR

Pavel Tolstov <lt>tolstov@meditprofi.ru<gt>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2006 by VIDI

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.3 or,
at your option, any later version of Perl 5 you may have available.


=cut
