#!/usr/bin/env python

from itertools import groupby, tee
import json, os

files = [
    ('hg38', 'http://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/cytoBand.txt.gz'),
    ('hg19', 'http://hgdownload.soe.ucsc.edu/goldenPath/hg19/database/cytoBand.txt.gz'),
    ('hg18', 'http://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/cytoBand.txt.gz')]

chroms = ['chr' + str(i + 1) for i in range(22)] + ['chrX', 'chrY']

Kchrom = 0

def fetch(name, url):
    os.system("curl %s | gunzip > cytoBand_%s" % (url, name));

def parseLine(line):
    [chrom, start, end, id, _] = line
    return [int(start), int(end), id]

def write(name):
    with open('cytoBand_%s' % name, 'r') as fh:
        lines = map(lambda l: l.strip().split('\t'), fh.readlines())
        bychrom = dict([(k, list(l)) for (k, l) in groupby(lines, lambda line: line[Kchrom])])
        filtered = {chrom: map(parseLine, list(bychrom[chrom])) for chrom in chroms}
        with open('cytoBand_%s.json' % name, 'w') as wfh:
            wfh.write(json.dumps(filtered))

for (name, url) in files:
#    fetch(name, url)
    write(name)
