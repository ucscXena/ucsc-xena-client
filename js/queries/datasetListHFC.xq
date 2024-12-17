; datasetListHFC
(fn [cohorts]
    (let [dataset-counts
          (query {:select [:dataset.name :samples]
                  :from [:dataset]
                  :join [:field [:= :dataset.id :dataset_id]
                         :sample [:= :field.id :field_id]]
                  :where [:and [:= :field.name "sampleID"]
                               [:in :dataset.cohort cohorts]]})
          datasets (map :name dataset-counts)
          counts (map (fn [x] (count (:samples x))) dataset-counts)
          count-table {:table [[[:dname :varchar datasets] [:count :int counts]] :T]}]
        (query {:select [:d.name :d.longtitle :count :d.type :d.datasubtype :d.probemap :d.text :d.status [:pm-dataset.text :pmtext]]
                   :from [[:dataset :d]]
                   :left-join [[:dataset :pm-dataset] [:= :pm-dataset.name :d.probemap]
                                count-table [:= :dname :d.name]]
                   :where [:in :d.cohort cohorts]})))
