; datasetGeneProbeAvg
(fn [dataset, samples, genes]
	(let [probemap (:probemap (car (query {:select [:probemap]
										   :from [:dataset]
										   :where [:= :name dataset]})))
		  probes-for-gene (fn [gene] ((xena-query {:select ["name"] :from [probemap] :where [:in :any "genes" [gene]]}) "name"))
		  avg (fn [scores] (mean scores 0))
		  scores-for-gene (fn [gene]
			  (let [probes (probes-for-gene gene)
					scores (fetch [{:table dataset
									:samples samples
									:columns (probes-for-gene gene)}])]
				{:gene gene
				 :scores (if (car probes) (avg scores) [[]])}))]
	  (map scores-for-gene genes)))
