; datasetList
(fn [cohorts]
    (query {:select [:d.name :d.type :d.datasubtype :d.probemap :d.text :d.status [:pm-dataset.text :pmtext]]
	    :from [[:dataset :d]]
            :left-join [[:dataset :pm-dataset] [:= :pm-dataset.name :d.probemap]]
	    :where [:in :d.cohort cohorts]}))
