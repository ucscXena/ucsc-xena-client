; datasetSamplesHFCExamples
(fn [dataset count]
  (take count (car (map :samples
                        (query {:select [:samples]
                                :from [:sample]
                                :join [:dataset [:= :dataset_id :dataset.id]
                                       :field [:= :field_id :field.id]]
                                :where [:and [:= :dataset.name dataset]
                                             [:= :field.name "sampleID"]]})))))
