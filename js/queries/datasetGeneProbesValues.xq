; datasetGeneProbesValues
(fn [dataset samples genes]
    (let [probemap (:probemap (car (query {:select [:probemap]
                                           :from [:dataset]
                                           :where [:= :name dataset]})))
            pmap-meta (:text (car (query {:select [:text]
                                          :from [:dataset]
                                          :where [:= :name probemap]})))
            position (xena-query {:select ["name" "position"] :from [probemap] :where [:in :any "genes" genes]})
            probes (position "name")]
      [pmap-meta
       position
       (fetch [{:table dataset
                :samples samples
                :columns probes}])]))
