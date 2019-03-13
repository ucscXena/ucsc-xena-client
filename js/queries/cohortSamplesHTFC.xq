; cohortSamplesHTFC
(fn [cohort limit]
  (apply distinct-htfc
    (map :samples (query {:select [:samples]
                          :from [:sample]
                          :join [:dataset [:= :dataset_id :dataset.id]]
                          :where [:= :cohort cohort]}))))
