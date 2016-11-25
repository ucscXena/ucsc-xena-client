;allCohorts
(fn []
	(map :cohort
	  (query
		{:select [[#sql/call [:distinct #sql/call [:ifnull :cohort "(unassigned)"]] :cohort]]
		 :from [:dataset]})))
