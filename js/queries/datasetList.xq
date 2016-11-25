; datasetList
(fn [cohorts]
	(query {:select [:name :type :datasubtype :probemap :text :status]
			:from [:dataset]
			:where [:in :cohort cohorts]}))
