; cohortSamples
(fn [cohort]
	(map :value
	  (query
		{:select [:%distinct.value]
		 :from [:dataset]
		 :join [:field [:= :dataset.id :dataset_id]
				:code [:= :field_id :field.id]]
		 :where [:and [:= :cohort cohort]
					  [:= :field.name "sampleID"]]})))
