; cohortSummary
(fn [exclude]
	(query {:select [:cohort [:%count.* :count]]
			:from [:dataset]
			:where [:and
					 [:= :status "loaded"]
					 [:not [:in :type exclude]]]
			:group-by [:cohort]}))
