#!/bin/bash

VERSION=$(grep -E "=\d{1,2}\.\d{1,2}\.\d{1,3}" src/index.html | sed -e "s/^.*=\([0-9]*\.[0-9]*.[0-9]*\).*$/\1/")
DISTFILE="dist/btlctl-${VERSION}.src.tgz"
echo -n "Rolling dist $DISTFILE ... "
[ -d dist ] || mkdir dist
tar -C .. -czf $DISTFILE \
    $(git ls-files redist src | grep -vE "/sass/|/t/|tests.html" | sed -e 's/\(.*\)/btlctl\/\1/' ) \
    && echo "ok!" || echo "failed!"
