#!/usr/bin/perl -w
use strict;
use FindBin;
#use lib "$FindBin::Bin/tools";
use File::Copy;

my $BINDIR = "$FindBin::Bin/..";
my $SRCDIR = $FindBin::Bin;

		# perl modules
		opendir(DIR, "$SRCDIR/lib");
		my @lib = grep !/^\.{1,2}/, readdir(DIR);
		closedir(DIR);
		for my $mod_class ( @lib ) {
			opendir(DIR, "$SRCDIR/lib/$mod_class");
			my @mods = grep !/^\.{1,2}/, readdir(DIR);
			closedir(DIR);
			for my $mod ( @mods ) {
			    if( "${mod_class}::${mod}" eq 'VN::HASP' ) {
				    print "\nskipping '${mod_class}::${mod}' module...\n";
				    next;
			    }
				print "\ncompiling '${mod_class}::${mod}' module...\n";
				my $dstdir_lib="$BINDIR/lib/auto/$mod_class/$mod";
				my $dstdir_pm="$BINDIR/lib/$mod_class";
				for my $d ( $dstdir_pm, $dstdir_lib ) {
				    print sprintf "create dir %s\n", $d;
					system("mkdir -p $d");
				}
				my $srcdir_lib = "$SRCDIR/lib/$mod_class/$mod";
				system(qq|cd $srcdir_lib; perl Makefile.PL >/dev/null && make -s 2>&1 >/dev/null;|);
				print STDERR qq|cp -R $srcdir_lib/blib/arch/auto/$mod_class/$mod/* $dstdir_lib\n|;
				system(qq|cp -R $srcdir_lib/blib/arch/auto/$mod_class/$mod/* $dstdir_lib|);
                if( -f "$srcdir_lib/blib/lib/auto/$mod_class/$mod/autospli.ix" ) {
					system(qq|cp $srcdir_lib/blib/arch/auto/$mod_class/$mod/* $dstdir_lib|);
				}
				system(qq|echo '1;' > $dstdir_lib/autosplit.ix|);
#				print `ls $dstdir_pm`;
				print qq|cp $srcdir_lib/lib/$mod_class/$mod.pm $dstdir_pm|, "\n";
				system(qq|cp $srcdir_lib/lib/$mod_class/$mod.pm $dstdir_pm|);
			}
		}

