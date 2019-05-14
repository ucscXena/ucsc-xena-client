; matchPartialField
(fn [dataset names limit]
  (map :name (query {:select [:field.name]
                     :limit limit
                     :order-by [:field.name]
                     :from [:dataset]
                     :join [{:table [[[:name :varchar names]] :T]} [:like :field.name :T.name]
                            :field [:= :dataset.id :field.dataset_id]]
                     :where [:and  [:= :dataset.name dataset]]})))
