; datasetGeneProbes
(fn [dataset, samples, gene]
	(let [probemap (:probemap (car (query {:select [:probemap]
										   :from [:dataset]
										   :where [:= :name dataset]})))
		  probes ((xena-query {:select ["name"] :from [probemap] :where [:in :any "genes" [gene]]}) "name")]
	  [probes
		(fetch [{:table dataset
				 :samples samples
				 :columns probes}])]))
