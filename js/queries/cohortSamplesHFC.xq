; cohortSamplesHFC
(fn [cohort limit]
  (apply union
    (map :samples (query {:select [:samples]
                          :from [:sample]
                          :join [:dataset [:= :dataset_id :dataset.id]
                                 :field [:= :field_id :field.id]]
                          :where [:and [:= :cohort cohort]
                                       [:= :field.name "sampleID"]]}))))
