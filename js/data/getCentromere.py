#!/usr/bin/env python

from itertools import groupby, tee
import json, os

assemblies = ['hg38', 'hg19', 'hg18']

chroms = ['chr' + str(i + 1) for i in range(22)] + ['chrX', 'chrY']

Kchrom = 0

def parseLine(line):
    [chrom, start, end, id, _] = line
    return [int(start), int(end), id]

def write(name):
    with open('cytoBand_%s.json' % name, 'r') as fh:
        cb = json.loads(fh.read())
        lastp = {chrom: [x for x in cb[chrom] if x[2][0] == 'p'][-1][1] for chrom in chroms}
        firstq = {chrom: [x for x in cb[chrom] if x[2][0] == 'q'][0][0] for chrom in chroms}
        if lastp != firstq:
            raise Exception('Indeterminate centromere position')
        with open('centromere_%s.json' % name, 'w') as wfh:
            wfh.write(json.dumps(firstq))

for name in assemblies:
    write(name)
