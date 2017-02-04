#!/usr/bin/env python

from itertools import groupby, tee
import json, os

files = [
    ('hg38', 'http://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/chromInfo.txt.gz'),
    ('hg19', 'http://hgdownload.soe.ucsc.edu/goldenPath/hg19/database/chromInfo.txt.gz'),
    ('hg18', 'http://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/chromInfo.txt.gz')]

chroms = ['chr' + str(i + 1) for i in range(22)] + ['chrX', 'chrY']

Kchrom = 0
Klen = 1

def fetch(name, url):
    os.system("curl %s | gunzip > chromInfo_%s" % (url, name));

def write(name):
    with open('chromInfo_%s' % name, 'r') as fh:
        lines = map(lambda l: l.strip().split('\t')[Kchrom: Klen + 1], fh.readlines())
        bychrom = {chrom: length for [chrom, length] in lines}
        filtered = {chrom: int(bychrom[chrom]) for chrom in chroms}
        with open('chromInfo_%s.json' % name, 'w') as wfh:
            wfh.write(json.dumps(filtered))

for (name, url) in files:
    fetch(name, url)
    write(name)
