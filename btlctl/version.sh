#!/bin/bash
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
VERSION=$1
if [ -z "$VERSION" ]; then echo Usage:; echo $0 x.y.z; echo; exit 1; fi

FILES=( src/index.html \
        src/app/require.config.js \
        src/app/viewmodel/baltasar.js
      )
for file in ${FILES[*]}; do
    echo $file
    grep -E "=\d{1,2}\.\d{1,2}\.\d{1,3}" $file >/dev/null && {
        sed -e "s/=[0-9]*\.[0-9]*.[0-9]*/=$VERSION/" -i ".version-patched" $file
        diff ${file}.version-patched $file
        unlink ${file}.version-patched 
    } \
    || grep -E "=\s*\"\d{1,2}\.\d{1,2}\.\d{1,3}\"\s*;" $file && { 
        sed -e "s/\(= *\"\)\([0-9]*\.[0-9]*.[0-9]*\)\(\" *;\)/\1$VERSION\3/" \
            -i ".version-patched" $file
        diff ${file}.version-patched $file
        unlink ${file}.version-patched 
    }
 
    echo "----------------------------------------"
done
