// construct a default dashboard
var dashboard ='{"title":"Introduction","services":{"query":{"list":{"0":{"query":"*","alias":"","color":"#7EB26D","id":0,"pin":false,"type":"lucene","enable":true}},"ids":[0]},"filter":{"list":{},"ids":[]}},"rows":[{"title":"Intro","height":"450px","editable":false,"collapse":false,"collapsable":false,"panels":[{"error":false,"span":12,"editable":false,"group":["default"],"type":"text","mode":"markdown","content":"hello","style":{},"title":"","status":"Stable"}],"notice":false}],"editable":false,"index":{"interval":"none","pattern":"[logstash-]YYYY.MM.DD","default":"_all","warm_fields":false},"style":"dark","failover":false,"panel_hints":true,"nav":[],"loader":{"save_gist":false,"save_elasticsearch":true,"save_local":true,"save_default":true,"save_temp":true,"save_temp_ttl_enable":true,"save_temp_ttl":"30d","load_gist":true,"load_elasticsearch":true,"load_elasticsearch_size":20,"load_local":true,"hide":false},"refresh":false}';
dashboard = JSON.parse(dashboard);
dashboard.editable=false;
dashboard.style="light";
dashboard.loader = {
	    save_gist: false,
	    save_elasticsearch: false,
	    save_local: false,
	    save_default: false,
	    save_temp: false,
	    save_temp_ttl_enable: false,
	    save_temp_ttl: "30d",
	    load_gist: false,
	    load_elasticsearch: false,
	    load_elasticsearch_size: 20,
	    load_local: false,
	    hide: true,
		editable: false
}; // end dashboard.loader

// check the top object - it contains the input for the Performance panels
if( !top || !top.gpad || !top.gpad.performance || !top.gpad.performance.dashboard ){
	var row = dashboard.rows[0];
	var panel = dashboard.rows[0].panels[0];
	dashboard.pulldowns=[];
	dashboard.title = "Atlas Performance";
	return dashboard;
} // end if

// get dashboard inputs from the top
var input 		= top.gpad.performance.dashboard;
var endpoints 	= (input.endpoints)?input.endpoints.split(','):[];
var hosts 		= (input.hosts)?input.hosts.split(','):[];
var mode 		= (input.modes)?input.modes.split(','):[];
var status 		= (input.status)?input.status.split(','):[];
var showpanel 	= input.showpanel;
var debug 		= input.debug;
var title 		= input.title;

var metrics_info = top.gpad.performance.metrics;
var endpoints_info = top.gpad.performance.endpoints;

var index 		= "logstash-server-performancemonitor";
var colors 		= ["green","yellow","blue","orange","orange","pink","purple","gray","gold"];
var timespan	= "1d";


////////////////////////////////////////
// Dashboard Queries

function buildQueriesByHosts(){
	var queries={};
	var ids={};
	var ID=0;
	for( var i in hosts ){
		ids[hosts[i]]=[];
		for( var j in endpoints ){
			var tokens = endpoints[j].split("::");
			var ep = tokens[0];
			var mtid = parseInt(tokens[1]);
			var mt = endpoints_info[ep].metrics[mtid];
			var alias = ep + "::" + mt; 
			
			var v="";
			v += "host:"+hosts[i];
			v += " AND ";
			v += "status:"+status;
			v += " AND ";
			v += "target:"+ep;
			v += " AND ";
			v += 'name:"'+mt.replace(",","?").replace(":","?")+ '"';
			
			queries[ID]={
				query: v,
				id: ID,
				alias:alias, 
				color:colors[i]
			}; 
			ids[hosts[i]].push(ID);
			ID++;
		} // end for
	} // end for
	return { queries:queries, ids:ids };
} // end buildQueriesByHosts()

function buildQueriesByAllHosts(){
	var queries={};
	var ids={};
	var ID=0;
	var allhosts = "(";
	var titleallhosts = "(" + hosts.join(",") + ")";
	for( var i in hosts ){
		allhosts += "host:"+hosts[i];
		if( i < hosts.length - 1 )
			allhosts += " OR ";
	} // end for
	allhosts += ")";
		
	for( var j in endpoints ){
		ids[endpoints[j]]=[];
		var tokens = endpoints[j].split("::");
		var ep = tokens[0];
		var mtid = parseInt(tokens[1]);
		var mt = endpoints_info[ep].metrics[mtid];
		var alias = titleallhosts + " " + ep + "::" + mt; 
			
		var v="";
		//v += "host:"+hosts[i];
		v += allhosts;
		v += " AND ";
		v += "status:"+status;
		v += " AND ";
		v += "target:"+ep;
		v += " AND ";
		v += 'name:"'+mt.replace(",","?").replace(":","?")+ '"';
			
		queries[ID]={
			query: v,
			id: ID,
			alias:alias, 
			color:colors[j]
		}; 
		ids[endpoints[j]].push(ID);
		ID++;
	} // end for
	return { queries:queries, ids:ids };
} // end buildQueriesByAllHosts()

function buildQueriesByEndPoints(){
	var queries={};
	var ids={};
	var ID=0;
	for( var i in endpoints ){
		ids[endpoints[i]]=[];
		for( var j in hosts ){
			var tokens = endpoints[i].split("::");
			var ep = tokens[0];
			var index = parseInt(tokens[1]);
			var mt = endpoints_info[ep].metrics[index];
			var alias = hosts[j];// + " - " + ep + "::" + mt; 
			
			var v="";
			v += "host:"+hosts[j];
			v += " AND ";
			v += "status:"+status;
			v += " AND ";
			v += "target:"+ep;
			v += " AND ";
			v += 'name:"'+mt.replace(",","?").replace(":","?")+ '"';
			
			queries[ID]={
				query: v,
				id: ID,
				alias:alias, 
				color:colors[j]
			}; 
			ids[endpoints[i]].push(ID);
			ID++;
		} // end for
	} // end for
	return { queries:queries, ids:ids };
} // end buildQueriesByEndPoints()

//////////////////////////////////////////
// Dashboard Charts

function buildRowsOfChartsByEndPoints(){
	rows=[];	
	
	for(var i in endpoints ){
		var tokens = endpoints[i].split("::");
		var epid = tokens[0];
		var mtid = tokens[1];
		var mt = endpoints_info[epid].metrics[mtid];
		var title = epid + " - " + mt; 
		var threshold = top.gpad.performance.getThreshold( metrics_info[mt].category );
		
		//alert( threshold );
		
		// create the row
		var row={};
		row.title=title;
		row.height="300px";
		row.panels=[];
		
		// create the panel in the row
		panel={};
		panel.queries={};
		panel.queries.mode="selected";
		panel.queries.ids=queries.ids[endpoints[i]];
		panel.title=title;
		panel.time_field="@timestamp";
		panel.auto_int=false;
		panel.interval="1m";
		panel.span=12;
		panel.spyable=true;
		panel.lines=true;
		panel.bars=false;
		panel.scale=1;
		panel.stack=false;
		panel.type="histogram";
		
		if( mode == "max" ){
			panel.mode="max";
			panel.value_field="max";
			panel.title = "Maximum - " + panel.title;
		}
		else if( mode == "min" ){
			panel.mode="min";
			panel.value_field="min";
			panel.title = "Minimum - " + panel.title;	
		}
		else if( mode == "mean" ){
			panel.mode="mean";
			panel.value_field="avg";
			panel.title = "Average - " + panel.title;	
		}
		else if( mode == "count" ){
			panel.mode="total";
			panel.value_field="count";
			panel.title = "Count - " + panel.title;			
		}
		else if( mode == "weighted-mean" ){
			panel.mode="weighted-mean";
			panel.value_field="avg";
			panel.value_field_count="count";
			panel.title = "Weighted Average - " + panel.title;			
			panel.type="histogramex";
		}
		else if( mode == "all-servers"){
			var titleallhosts = "(" + hosts.join(",") + ") ";
			panel.title = titleallhosts + panel.title;
			panel.mode="all";
			panel.type="histogramex";
			panel.value_field="avg";
			panel.value_field_count="count";
			panel.value_field_min="min";
			panel.value_field_max="max";
			panel.value_field_threshold=threshold;
		}
		
		row.panels.push(panel);
		rows.push(row);
	} // end for
	return rows;
} // end buildRowsOfChartsByEndPoints()

function buildRowsOfChartsByHosts(){
	rows=[];	
	id=0;
	for(var i in hosts ){
		for(var j in endpoints ){
			var tokens = endpoints[j].split("::");
			var epid = tokens[0];
			var mtid = tokens[1];
			var mt = endpoints_info[epid].metrics[mtid];
			var title = hosts[i] + " - " + epid + " - " + mt; 
			var threshold = top.gpad.performance.getThreshold( metrics_info[mt].category );
			
			//alert( threshold );
			
			// create the row
			var row={};
			row.title=title;
			row.height="300px";
			row.panels=[];
		
			// create the panel in the row
			panel={};
			panel.queries={};
			panel.queries.mode="selected";
			panel.queries.ids=[id];
			panel.title=title;
			panel.time_field="@timestamp";
			panel.auto_int=false;
			panel.interval="1m";
			panel.span=12;
			panel.spyable=true;
			panel.lines=true;
			
			panel.bars=false;
			panel.stack=false;
			panel.type="histogramex";
			panel.mode="all";
			panel.value_field="avg";
			panel.value_field_count="count";
			panel.value_field_min="min";
			panel.value_field_max="max";
			panel.value_field_threshold=threshold;
			row.panels.push(panel);
			rows.push(row);
			id++;
		} // end for
	} // end for
	return rows;
} // end buildRowsOfChartsByHosts()

function buildRowsOfGraphsByHosts(){
	var rows=[];	
	var row={};
	var title=hosts.join(",");
	row.title=title;
	row.height="800px";
	row.panels=[];
	panel={};
	panel.host=hosts.join(",");
	panel.title=title;
	panel.span=12;
	panel.spyable=true;
	panel.type="graph";
	row.panels.push(panel);
	rows.push(row);	
	return rows;
} // buildRowsOfGraphsByHosts()

//////////////////////////////////////////
// build the dashboard 

// build the queries and/or charts and/or graph
if( showpanel == "charts" ){
	if( mode == "all" ){
		var queries = buildQueriesByHosts();
		var rows = buildRowsOfChartsByHosts();	
	}
	else if( mode == "all-servers") {
		//alert("all-servers");
		var queries = buildQueriesByAllHosts();
		var rows = buildRowsOfChartsByEndPoints();
	}
	else {
		var queries = buildQueriesByEndPoints();
		var rows = buildRowsOfChartsByEndPoints();
	}
} // end if
else if( showpanel == "graphs" ){
	var rows = buildRowsOfGraphsByHosts();
}
else{
	return dashboard;
}

/////////////////////////////////////
// initialize the dashboard object

dashboard.rows = rows;

if( debug == false ){
	dashboard.pulldowns=[];
	dashboard.loader = {
		save_gist: false,
		save_elasticsearch: false,
		save_local: false,
		save_default: false,
		save_temp: false,
		save_temp_ttl_enable: false,
		save_temp_ttl: "30d",
		load_gist: false,
		load_elasticsearch: false,
		load_elasticsearch_size: 20,
		load_local: false,
		hide: true,
		editable: false
	}; // end dashboard.loader
	dashboard.editable=false;
} // end if

dashboard.title = title;
dashboard.index = {
	default: index
}; // end dashboard.index

dashboard.nav = [
        {
          type: "timepicker",
          collapse: false,
          notice: false,
          enable: true,
          status: "Stable",
          time_options: [
            "5m",
            "15m",
            "1h",
            "6h",
            "12h",
            "24h",
            "2d",
            "7d",
            "30d"
          ],
          refresh_intervals: [
            "5s",
            "10s",
            "30s",
            "1m",
            "5m",
            "15m",
            "30m",
            "1h",
            "2h",
            "1d"
          ],
        }];
        
if( queries ){
	dashboard.services={};
	dashboard.services.query = {
			list : queries.queries,
			ids : _.map(_.keys(queries.queries),function(v){return parseInt(v,10);})
	};
} // end if

dashboard.services.filter = {
	list: {
		0: {
			from: "now-"+timespan,
			to: "now",
			field: "@timestamp",
			type: "time",
			active: true,
			id: 0,
		    hide: true
		}
	},
	ids: [0],
}; // end dashboard.services.filter

//alert("loaded the dashboard from server");
return dashboard;
