; donorFields
(fn [cohort]
  (query {:select [:dataset.name [:field.name :field]]
          :from [:dataset]
          :join [:field [:= :dataset.id :dataset_id]]
          :where [:and [:= :cohort cohort]
                       [:= :dataset.type "clinicalMatrix"]
                       [:in :field.name ["_DONOR" "_DATASOURCE"]]]}))
