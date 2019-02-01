;probemapList
(fn []
  (query {:select [:dataset.name :text :hash]
          :from [:dataset]
          :join [:dataset-source [:= :dataset.id :dataset_id]
            :source [:= :source.id :source_id]]
          :where [:= :type "probeMap"]}))
