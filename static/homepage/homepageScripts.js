/*****************************************************************************************************
*
*  Vars:
*  	numProcesses                      //number of currently running services
*		procRows{}                        //dictionary of currently running services along with their pids, names, and corresponding table rows
*
*  Functions:
*		printProcs()                      //prints the values of procRows in console log; used for debugging
*		checkstatuses()                   //polling function; runs every 10 seconds; requests django check for "bad closes" and properly closes them if they exist
*		addRow(pname, pid)                //adds new row (process) to table with name 'pname' and PID 'pid'
*		pidtoname(pid)                    //returns the name of a service corresponding to PID 'pid'
*		deleteRow(row, bad_pid = null)    //deletes row 'row' from table (or bad_pid in the case of a bad close)
*		updateRows()                      //updates the values in procRows
*		runProcess(elem)                     //starts a service specified by the button pressed  
*		closeProcess(process)             //closes process 'process'
*
*
*
* NOTES:
* - USE CONSOLE.LOG TO DEBUG!!!
* - This script can correctly handle services that are opened/closed from within the user interface ("good closes")
* - This script can correctly handle services that are closed from outside the user interface ("bad closes")
* - The script does NOT correctly handle services STARTED from outside the user interface ("bad starts")
* - Your job is to test the UI using more complicated scripts (start with tor hidden services)
* 
*
* - Start buttons (top of homepage) must be named:             id="open" + processname
* - Stop buttons (each row in homepage table) must be named:   id=processname
*
*
* When adding new processes:
*		1) add button to btn-group in androidprocessmanager.html
*				- set id="open" + processname, text="Process Name"
*		2) create runProcess# function like those below
*	   3) create view in views.py like those shown in the file
*****************************************************************************************************/



var numProcesses = 0;
var procRows = {};  // {KEYS: processName, VALUES: [processName, processPID, processTableRowNumber]}



/*prints all the values in procRows; only used for debugging*/
function printProcs(){
	var strProcs = "procRows:\n[";	
	
	for(var key in procRows){
		strProcs += procRows[key] + ' ';
	}
	
	strProcs += "]";
	console.log(strProcs);
}



/*polling function; every 10 seconds, asks django to make sure the processes displayed in the table are still running 
	i.e. checks for bad closes
*/
function checkstatuses(){
	
   setInterval(function(){
   
      $.ajax({ type:"GET", url: "checkprocesses/", dataType: "json", success: function(data){
			
			if (data.closed.length > 0){
				console.log('checkstatuses(): ********Django sent back a badly closed process************');
				for(var i = 0; i < data.closed.length; ++i){
					//handle badly closed pid
					deleteRow(0, data.closed[i]);
				}
			}
			
      }});
  }, 10000);
};
checkstatuses();  //RUN polling function at startup




/*adds new row to running-processes table*/
function addRow(pname, pid){
	console.log('--addRow()--');
	
	//disable service button
	document.getElementById("open" + pname).disabled = true;	
	
	
	// get table
	var table = document.getElementById("processesTable");
	
	
	// add 1 row to the table:
	var row = table.insertRow(-1);


	// add 3 columns to the row
	var cell1 = row.insertCell(0);
	var cell2 = row.insertCell(1);
	var cell3 = row.insertCell(2);
	

	// Fill in the new cells:
	cell1.innerHTML = pname;
	cell2.innerHTML = pid;
	cell3.innerHTML = "<td><input type='button' id=" + pname.replace(/\s/g, '') + " value='Stop' onclick='closeProcess(this)'></td>"
	
	
	// increment number of processes
	numProcesses = numProcesses + 1; 
	

	updateRows();
}




/*searches procRows for the process 'name' corresponding to 'pid'*/
function pidToName(pid) {
		console.log('--pidtoname()--');
		
		for (var item in procRows){

			if (procRows[item][1] == String(pid)) {    
				console.log('pidtoname(): translating ' + pid + " to: " + procRows[item][0]);
				return procRows[item][0];                //return the name of that item
			}		
		}
		
		console.log("null");
		return null;                                   //return null if pid not found
}





/*deletes row from running-processes table, corresponding to the "Stop" button that was pressed*/
function deleteRow(r, bad_pid = null) {
	console.log('--deleteRow()--');
	
	var rowNumber;	    //table row corresponding to the target process
	
	/*get the correct row number to delete*/
	if(bad_pid === null){
		//row # gotten from the "Stop" button that was pressed
   	rowNumber = r.parentNode.parentNode.rowIndex;
   }
   else{
   	//row # gotten directly from parameter "bad_pid"; result of a 'bad close'; called from checkstatuses()
   	var bad_proc = pidToName(bad_pid);                   
   	//re-enable start button
		document.getElementById('open' + bad_proc).disabled = false;                
   	console.log('deleteRow(): **Process ' + bad_proc + ' closed incorrectly***');
		rowNumber = procRows[bad_proc][2];
   }                                                                       
   
   
   /*delete the row element and update the table*/
   document.getElementById("processesTable").deleteRow(rowNumber);         
   console.log('deleteRow(): deleted row ' + rowNumber + ' from table');	
	
	//decrement number of processes
	numProcesses = numProcesses - 1;
	
	updateRows();
	
	
	var procRowsLen = Object.keys(procRows).length;                         
	console.log('deleteRow(): numProcess: ' + String(numProcesses) + '  ' + 'procrowslen: ' + procRowsLen);
}





/*Match table row with its corresponding process (called after addRow and deleteRow)
	Note: This function should be called after making ANY change to the table.
			It ensures that the row information in procRows is correct
*/
function updateRows(){
	console.log('--updateRows()--');	
	
	procRows = {};                                                                          //delete current processes list
	var row;
	var tableSize = document.getElementById("processesTable").rows.length;
	tableSize -= 1; //bc the header row doesn't count
	console.log('updateRows(): new tablesize: ' + String(tableSize));
	for(var i = 0; i < tableSize; ++i){
		
		var name = document.getElementById("processesTable").rows[i+1].cells[0].innerHTML;  //read process names directly from table
		var pid = document.getElementById("processesTable").rows[i+1].cells[1].innerHTML;   //read pids directly from table
		row = i+1;
		procRows[name.replace(/\s/g, '')] = [name, pid, row];                               //re-write processes list
	}

}




//starts process
function runProcess(elem){
	console.log("--runProcess()--");
	
	processName = $(elem).data('name');
	console.log("runProcess(): Running Process " + processName);
	
	
	var date = new Date();
	var time = date.getTime();
	
	
	//start tor
	$.ajax({
			type: "POST",
			dataType: "json",
			data: {'processName': processName},
			url: "startprocess/",
			success: function(result){
				console.log('runProcess1(): Successful open');
				console.log(result);
				addRow(result.name, result.pid);
			}, 
			error: function(jqxhr, stat, exception){
				console.log("Process failed to start properly");
			}
	});  
		
}





/* Implements all process-closing procedures for 'process'*/
function closeProcess(process){
	console.log('--closeProcess()--');
	
	//re-enable start button
	document.getElementById('open' + process.id).disabled = false;	
	
	
	//get target PID (from procRows) using process name
	var pid = procRows[process.id][1];
	
	console.log('closeProcess(): send django request to close ' + pid);	
	
	//send target PID to django
	$.ajax({
		type: "POST",
		datatype: "json",
		data: {'pid': pid},
		url: "stopprocess/", 
		success: function(result){
			console.log('closeProcess(): Successful close; django sent back pid: ');
			console.log(result);
			deleteRow(process);       //delete corresponding row from table
		},
		error: function(jqxhr, stat, exception){
			alert('Process failed to shutdown\n' + exception.responseText);
		}
	});
	
}



