; cohortMaxSamples
(fn [cohort]
    (:count
     (car (query
           {:select [[:%max.count :count]]
            :from [{:select [[:dataset.name :dname] [:%count.value :count]]
                    :from [:dataset]
                    :join [:field [:= :dataset.id :dataset_id]
                           :code [:= :field.id :field_id]]
                    :group-by [:dataset.name]
                    :where [:and
                            [:= :field.name "sampleID"]
                            [:= :cohort cohort]]}]}))))
