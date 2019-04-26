; matchFieldsFaster
(fn [dataset names]
  (map :name (query {:select [:field.name]
                     :from [:dataset]
                     :join [{:table [[[:name :varchar names]] :T]} [:= :T.name :field.name]
                            :field [:= :dataset.id :field.dataset_id]]
                     :where [:and  [:= :dataset.name dataset]]})))
