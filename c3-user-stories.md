Please edit this template and commit to the master branch for your user stories submission.   
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-21w2-intro-to-se/project/checkpoint-3).

## Template
As a \<role\>, I want to \<goal\>, so that \<benefit\>.


#### Definitions of Done(s)
Scenario 1: \<The name for the behaviour that will be described\>  
Given: \<Some initial application state (precondition)\>  
When: \<The user do some series of action\>  
Then: \<Some outcome state is expected (post-condition)\>


## User Story 1
As a UBC staff, I want to be able to find out the historical average of a 
course over a defined period of time in the past, so that I have a reference 
point for determining the evaluation standards of the current year. 


#### Definitions of Done(s)
<ins>Scenario 1: Valid Search Criteria</ins>  
Given: the user is on the course average query page  
When: a valid pair of course code and time range is entered, and "search" is clicked  
Then: the website displays the name and average score of the section in the specified period

<ins>Scenario 2: Invalid Search Criteria</ins>  
Given: the user is on the course average query page  
When: either an invalid course code or time range is entered, and "search" is clicked  
Then: the website shows red text over the invalid field


## User Story 2
As a UBC staff, I want to be able to find a list of classrooms that have over 200 seats, 
so that I can potentially hold an exam there. 

#### Definitions of Done(s) 
<ins>Scenario 1: Valid Search Criteria</ins>  
Given: The user is on the classroom searching page/section  
When: The user enters a valid range or seats is entered using a sliding bar, and "search" is clicked  
Then: the website shows a table showing the information of rooms that fit the criteria.

<ins>Scenario 2: Invalid Search Criteria</ins>  
Given: The user is on the classroom searching page/section  
When: The user enters an number that exceeds all classroom capacity, and "search" is clicked  
Then: The website remains in search page and shows the user no room with such capacity is found.



## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.  
Note: These will not be graded.
