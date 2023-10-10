;datasetGeneSignature
(fn [dataset samples genes weights]
 (let [probemap (:probemap (car (query {:select [:probemap]
                                        :from [:dataset]
                                        :where [:= :name dataset]})))
       get-probes (fn [gene] (xena-query {:select ["name" "position"]
                                          :from [probemap]
                                          :where [:in :any "genes" [gene]]}))
       avg (fn [scores] (mean scores 0))
       scores-for-gene (fn [gene]
                         (let [probes (get-probes gene)
                               probe-names (probes "name")
                               scores (fetch [{:table dataset
                                               :samples samples
                                               :columns probe-names}])]
                           (if (car probe-names) (car (avg scores)) [])))]

     ; putting in an object avoids a liberator encoding error
     {:scores (apply + (map (fn [w v] (* v w)) weights (map scores-for-gene genes)))}))
