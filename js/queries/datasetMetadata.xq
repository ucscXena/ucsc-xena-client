; datasetMetadata
(fn [dataset]
	(query {:select [:name :longtitle :type :datasubtype :probemap :text :status]
			:from [:dataset]
			:where [:= :dataset.name dataset]}))
