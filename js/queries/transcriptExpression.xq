; transcriptExpression
(fn [transcripts subtypeA subtypeB dataset phenoDataset phenoColumn]
  (let [fetchSamples
          (fn [subtype]
                  ((xena-query {:select ["sampleID"]
                                :from [phenoDataset]
                                :where [:in phenoColumn [subtype]]})  "sampleID"))]
    [(fetch [{:table dataset
              :columns transcripts
              :samples (fetchSamples subtypeA)}])
     (fetch [{:table dataset
              :columns transcripts
              :samples (fetchSamples subtypeB)}])]))
