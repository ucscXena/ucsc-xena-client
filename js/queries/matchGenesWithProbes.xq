; matchGenesWithProbes
(fn [dataset names]
  (let [probemap (:probemap (car (query {:select [:probemap] :from [:dataset] :where [:= :dataset.name dataset]})))
        getfield (fn [field]
                   (:id (car (query {:select [:field.id]
                                     :from [:dataset]
                                     :join [:field [:= :dataset.id :field.dataset_id]]
                                     :where [:and [:= :field.name field] [:= :dataset.name probemap]]}))))
        genes (getfield "genes")
        matches (map :gene (query {:select [:%distinct.gene]
                                   :from [:field_gene]
                                   :join [{:table [[[:name :varchar names]] :T]} [:= :T.name :gene]]
                                   :where [:= :field_gene.field_id genes]}))
        probes (map (fn [gene]
                      (let [probes
                            ((xena-query {:select ["name"]
                                          :from [probemap]
                                          :where [:in :any "genes" [gene]]}) "name")]
                        (:count (car (query {:select [[:%count.field.name :count]]
                                             :limit 1
                                             :from [:field]
                                             :join [:dataset [:= :dataset.id :dataset_id]
                                                    {:table [[[:name :varchar probes]] :T]} [:= :T.name :field.name]]
                                             :where [:= :dataset.name dataset]})))))
                    matches)
        filtered (map :name (query {:select [:name]
                                    :from [{:table [[[:name :varchar matches] [:count :int probes]] :T]}]
                                    :where [:<> :count 0]}))]
    filtered))
