; cohortMaxSamplesHFC
(fn [cohort]
    (let [counts
          (map (fn [r] (count (:samples r)))
               (query {:select [:samples]
                       :from [:dataset]
                       :join [:field [:= :dataset.id :dataset_id]
                              :sample [:= :field.id :field_id]]
                       :where [:and [:= :field.name "sampleID"]
                                    [:= :dataset.cohort cohort]]}))]
      (:count (car
               (query {:select [[:%max.count :count]]
                       :from [{:table [[[:count :int counts]] :T]}]})))))
