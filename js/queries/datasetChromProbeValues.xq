; datasetChromProbeValues
(fn [dataset samples chr start end]
	(let [probemap (:probemap (car (query {:select [:probemap]
										   :from [:dataset]
										   :where [:= :name dataset]})))
			position (xena-query {:select ["name" "position"] :from [probemap] :where [:in "position" [[chr start end]]]})
			probes (position "name")]
	  [position
		(fetch [{:table dataset
				 :samples samples
				 :columns probes}])]))

