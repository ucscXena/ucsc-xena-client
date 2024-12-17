; datasetMetadataHFC
(fn [dataset]
     (let [sample-count (count (:samples (car
        (query {:select [:samples]
                :from [:dataset]
                :join [:field [:= :dataset.id :dataset_id]
                       :sample [:= :field.id :field_id]]
                :where [:and [:= :field.name "sampleID"]
                             [:= :dataset.name dataset]]}))))]

        (query {:select [:d.name :d.longtitle [sample-count :count] :d.type :d.datasubtype :d.probemap :d.text :d.status [:pm-dataset.text :pmtext]]
                   :from [[:dataset :d]]
                   :left-join [[:dataset :pm-dataset] [:= :pm-dataset.name :d.probemap]]
                   :where [:= :d.name dataset]})))
