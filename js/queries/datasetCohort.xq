; datasetCohort
(fn [dataset]
	(query {:select [:cohort]
            :from [:dataset]
            :where [:= :dataset.name dataset]}))
