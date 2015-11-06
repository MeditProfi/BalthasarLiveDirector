function setActiveKey(keyName)
{
	var allKeys = document.getElementsByClassName("down_action");
	var i;
	for (i = 0; i < allKeys.length; i++) 
	{
		if (allKeys[i].className.indexOf("dummy") == -1)
			allKeys[i].style.backgroundColor = ""; 
	}
	
	var activeKey = document.getElementById(keyName);
	if (activeKey)
	{
		if (activeKey.className.indexOf("dummy") == -1)
			activeKey.style.backgroundColor = "#FF99FF"; 
	}
	else
		console.log("cannot find key");
}

function setCue(mode)
{
	var button = document.getElementById("CUE");
	if (mode == "none")
		button.style.backgroundColor = ""; 
	else
		button.style.backgroundColor = "#77AA77"; 
}

function setTake(mode)
{
	var button = document.getElementById("TAKE");
	if (mode == "none")
		button.style.backgroundColor = ""; 
	else
		button.style.backgroundColor = "#FF7777";
}

function addButtonDummy(parentId, newClass, newId, name1, name2, pict, key)
{
	var cont = document.createElement('div');
	cont.className = newClass;
	cont.style.backgroundColor = "inherit";

	var parent = document.getElementById(parentId);
	parent.appendChild(cont);
}

function addButton(parentId, newClass, newId, name1, name2, pict, key)
{
	var div11 = document.createElement('div');
	var div12 = document.createElement('div');
	var div21 = document.createElement('div');
	var div22 = document.createElement('div');
	
	div11.style.width = "40%"; div11.style.height = "60%"; div11.style.float="left";
	div12.style.width = "60%"; div12.style.height = "60%"; div12.style.float="left";
	div21.style.width = "30%"; div21.style.height = "40%"; div21.style.float="left";
	div22.style.width = "70%"; div22.style.height = "40%"; div22.style.float="left";

	var child11 = document.createElement('div');
	var child12 = document.createElement('div');
	var child21 = document.createElement('div');
	var child22 = document.createElement('div');
	child11.className = 'action_name';
	child12.className = 'action_pict';
	child21.className = 'action_name';
	child22.className = 'action_key';
	
	child11.innerHTML = name1;
	child12.innerHTML = '<img src="'+pict+'" width="108" height="60"/>';
	child21.innerHTML = name2;
	child22.innerHTML = key;
	
	div11.appendChild(child11);
	div12.appendChild(child12);
	div21.appendChild(child21);
	div22.appendChild(child22);
	
	var cont = document.createElement('div');
	cont.className = newClass;
	cont.setAttribute("id", newId);
	cont.appendChild(div11);
	cont.appendChild(div12);
	cont.appendChild(div21);
	cont.appendChild(div22);
	
	var parent = document.getElementById(parentId);
	parent.appendChild(cont);
}

function addInputTag(parentId, newClass, newId, key)
{	
	var element = document.createElement('div');
	element.style.top = "0";
	element.style.left = "0";
	element.style.width = "52px";
	element.style.height = "52px";		
	element.className = newClass;
	element.setAttribute("id", newId);
	element.innerHTML = key;
	var parent = document.getElementById(parentId);
	parent.appendChild(element);	
}

function setInputTagPos(id, x, y)
{
	var element = document.getElementById(id);
	if (element)
	{
		var absleft = 1920.0 * x;
		var abstop = 1080.0 * y;
		
		element.style.left = absleft;
		element.style.top = abstop;
	}
}

function setActiveInput(id)
{
	var allInputs = document.getElementsByClassName("input_tag");
	var i;
	for (i = 0; i < allInputs.length; i++) 
	{
		allInputs[i].style.backgroundColor = ""; 
	}
	
	var activeInput = document.getElementById(id);
	if (activeInput)
		activeInput.style.backgroundColor = "#FF99FF"; 
	else
		console.log("cannot find input");
}

/*
function addTemplateSelection(key, desc, thumbnail)
{
	var cont = document.getElementById("choose-container");
	if (cont)
	{
		var sel = document.createElement('div');
		sel.className = "key-choose block";
		sel.innerHTML = "";	
		sel.innerHTML += '<div class="sel-image"><img class="key-choose-img" src="'+thumbnail+'"/></div>';
		sel.innerHTML += '<div style="margin:15px;">'+key+': ' + desc + '</div>';
		cont.appendChild(sel);	
	}
}
*/
