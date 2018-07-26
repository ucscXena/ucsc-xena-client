; maxRange
(fn [dataset chr start end limit]
	(let [position (xena-query {:select ["position"] :from [dataset]
                                :where [:in "position" [[chr start end]]]
                                :offset limit :limit 1})]
	  (map :chromstart (position "position"))))
