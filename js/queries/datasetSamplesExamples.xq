; datasetSamplesExamples
(fn [dataset count]
	(map :value
	  (query
		{:select [:value]
		 :from [:dataset]
		 :join [:field [:= :dataset.id :dataset_id]
				:code [:= :field.id :field_id]]
		 :where [:and
				 [:= :dataset.name dataset]
				 [:= :field.name "sampleID"]]
		 :limit count})))
