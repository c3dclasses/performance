// sets preloaded images for the graph
var db = new Image(); 
db.src = "/c3dclasses-dashboard/resources/kibana/app/panels/graph/imgs/database.png";
var cpu = new Image(); 
cpu.src = "/c3dclasses-dashboard/resources/kibana/app/panels/graph/imgs/computer.png";
var srv = new Image(); 
srv.src = "/c3dclasses-dashboard/resources/kibana/app/panels/graph/imgs/service.png";

// sets up the rendering function to draw the graph 
var Renderer = function(elt){
	var that = {
		// properties	
		container:null,
		canvas:null,
		context:null,
		graphics:null,
		graph:null,
		selected:null,
		nearest:null,
		section:"",
		mousepos:null,
		
		// initializes the graph
		init:function(graph){
			that.graph = graph;
			that.container = $(elt);
			that.canvas = that.container.find("canvas").get(0);
			that.context = that.canvas.getContext("2d");
			that.graphics = arbor.Graphics(that.canvas);
			that.selected = null;
			that.nearest  = null;
			that.mousepos = null;
			that.dragged = null;
			$(window).resize(that.resize);
			that.resize();
			that.initMouseHandling();
		}, // end init()
    	
		// redraws the graph
		redraw:function(){
			var gfx = that.graphics;
			var ctx = that.context;
			var sys = that.graph;	
			gfx.clear();
			
			// draw each edge
			sys.eachEdge(function(edge, p1, p2){
				// draw line
				gfx.line(p1, p2, {stroke:"#00B8DB", width:1, alpha:1});
				
				// draw arrow
				weight=1;
				var wt = !isNaN(weight) ? parseFloat(weight) : ctx.lineWidth;
				var arrowLength = 10 + wt;
				var arrowWidth = 4 + wt;
				ctx.save();
					ctx.fillStyle = '#00B8DB';
					ctx.translate(p2.x-(p2.x-p1.x)/2, p2.y-(p2.y-p1.y)/2);
					ctx.rotate(Math.atan2(p2.y - p1.y, p2.x - p1.x));
					ctx.beginPath();
						ctx.moveTo(-arrowLength, arrowWidth);
						ctx.lineTo(0, 0);
						ctx.lineTo(-arrowLength, -arrowWidth);
						ctx.lineTo(-arrowLength * 0.8, -0);
					ctx.closePath();
					ctx.fill();
				ctx.restore();
			}); // end sys.eachEdge();
		
			// draw each node
			sys.eachNode(function(node, pt){
				var w = Math.max(22, 22);
				var data = node.data;
				var fsize = 9;
				var name = data.name.toUpperCase();
				if( data.type != "server" ){
					w = Math.max(25, 25);
					txtos = w + 7;
					fsize = 10;
					name += " (" + data.nummetrices + ")";
				} // end if
				else {
					w = 30;
					txtos = w + 7;
					fsize = 13;	
				} // end else
				
				// draw image
				ctx.drawImage(data.img,pt.x-w/2,pt.y-w/2,w,w);
				
				// draw health
				ctx.save();
					ctx.beginPath();
						ctx.strokeStyle = node.data.health;
						ctx.lineWidth = (that.nearest && that.nearest.node === node) ? 4 : 2;
						ctx.arc(pt.x,pt.y,w-4,0,2*Math.PI);
						ctx.stroke();
					ctx.closePath();
				ctx.restore();
			
				// draw caption
				gfx.text(name, pt.x, pt.y+txtos, {color:'#00B8DB', align:"center", font:"Arial", size:fsize});
			}); // sys.eachNode()
		}, // end redraw()
		
		// resizes the graph
		resize:function(){
			that.canvas.width = that.container.width();
			//that.canvas.width = $(window).innerWidth();
			that.canvas.height = that.container.height();
			that.graph.screen({size:{width:that.canvas.width, height:that.canvas.height}});
			that.redraw();
		}, // end resize()
		
		// initialize mouse interaction
		initMouseHandling:function(){
			
			// mouse move
			var fnmousemove = function(e){
				var canvaspos = $(that.canvas).offset();
				var point = arbor.Point(e.pageX-canvaspos.left, e.pageY-canvaspos.top);
				
				// check if the node is being dragged
				if( that.dragged !== null && that.dragged.node !== null ){
					var p = that.graph.fromScreen(point);
					that.dragged.node.p = p;
					return false;
				} // end if
				
				// get and redraw the nearest node
				that.mousepos = arbor.Point(e.pageX-canvaspos.left, e.pageY-canvaspos.top);
				var oldnearest = that.nearest;		
				that.nearest = that.graph.nearest( that.mousepos );
				if( oldnearest != that.nearest )
					that.redraw();
				return false;
			}; // end fnmousemove()
			
			// mouse down
			var fnmousedown = function(e){
				var canvaspos = $(that.canvas).offset();
				that.mousepos = arbor.Point(e.pageX-canvaspos.left, e.pageY-canvaspos.top);
				that.nearest = that.dragged = that.graph.nearest( that.mousepos );
			}; // end fnmousedown()
			
			// mouse up
			var fnmouseup = function(e){
				if( that.dragged ===  null || that.dragged.node === undefined )
					return;
				
				if( that.dragged !== null ) 
					that.dragged.node.fixed = false;
				
				that.dragged.node.tempMass = 100;
				that.dragged = null;
				that.mousepos = null;
				return false;
			}; // end fnmouseup()
			
			// double click
			var fndblclick = function(e){ 
				// get the position of the nearest node
				var canvaspos = $(that.canvas).offset();
				var pos = arbor.Point(e.pageX-canvaspos.left, e.pageY-canvaspos.top);
				var nearest = that.graph.nearest( pos );
				fnmouseup(e);
				if( nearest && nearest.node.data.type != "server" )
					top.showEndpointPerformanceDialog( nearest.node.data.name );
				return false;
			}; // end fndblclick()
			
			// mouse leave
			var fnmouseleave = function(e){
				that.nearest=null;
				that.redraw();
			}; // end fnmouseleave()
		
			// setup the event handlers
			$(that.canvas).mousedown( fnmousedown );
        	$(that.canvas).mousemove( fnmousemove );
			$(that.canvas).mouseup( fnmouseup );
			$(that.canvas).dblclick( fndblclick );
			$(that.canvas).mouseleave( fnmouseleave );
			//$(that.canvas).mouseover( fnmouseover );
			return;
		},// end initMouseHandling()
		
		update: function( host ){
			var sys = that.graph;
			if( !sys )
				return;		
			var server = host;
			var endpoints = top.gpad.performance.endpoints;
			var metrics = top.gpad.performance.metrics;
	
			// update edges
			sys.eachEdge(function(edge, p1, p2){
				//edge.data.failure;
			}); // end sys.eachEdge()
			
			// update nodes
			sys.eachNode(function(node, pt){
				//node.data.health
				if( node.data.type == "server" ){
					return;
				} // end if
			
				// compute the health of the endpoint node
				var health="green";
				for( var i in endpoints[node.name].metrics ){
					var mt = endpoints[node.name].metrics[i];		
					var avg = parseFloat(metrics[mt].curavg);
					if( avg >= top.gpad.performance.getThreshold( metrics[mt].category ) ){
						health = "red";
						break;
					} // end if			
				} // end for
				node.data.health=health;
			}); // end sys.eachNode()
			
			that.redraw();
		} // end update()
	
	}; // end that
	return that;
}; // end Renderer() 


//elastic search helper
function _es( es_url, es_query, es_callback ){
	$.ajax({
		url: es_url,
        type: 'POST',
        dataType: 'json',
        data: es_query, 
        success: function(response) {
			if( es_callback != null )
				es_callback( response );
        }, // end success()
		error: function(jqXHR, textStatus, errorThrown) {
        } // end error()
	}); // end $.ajax()
} // end _es()

////////////////////////////
// helper functions

function createGraph( element, options ){
	//var graph = arbor.ParticleSystem(2600, 0, 0.5);
	//{friction:.5, stiffness:600, repulsion:1000}
	//scope.graph = arbor.ParticleSystem(2600, 0, .5, 55, .02, true);
	var graph = arbor.ParticleSystem(options);
	graph.renderer = Renderer(element);
	graph.graft(createNodesEdges());
	graph.screenPadding(20);
	return graph;
} // end createGraph()

// gets the current averages from es
function getCurrentAverages( servers, callback ){
	if( servers == "" )
		return;
	
	var metrics = top.gpad.performance.metrics;
	var esurl = top.gpad.performance.dashboard.esuri + "/logstash-c3classes-performancemonitor/_search";
	var minutesago = top.gpad.performance.metricavgforlastminutes;
	var d = new Date();
	var now = d.getTime(); 
	d.setMinutes(d.getMinutes() - minutesago);
	var then = d.getTime();
	
	// create the facets
	var query = "*";
	var fromtime = then;
	var totime = now;
	var facets = [];
	var servers = servers.split(",");
	var str="";
	for( var i in servers ){
		str += "host:" + servers[i];
		if( i < servers.length-1 )
			str += " OR ";
	} // end for
	servers = "("+ str +")";
	
	for( var mt in metrics ){
		query = servers;
		query += " AND ";
		query += "status:SUCCESS";
		query += " AND ";
		query += "name:/"+mt.replace(",","?").replace(":","?")+"/";
		query += "";
		facets.push( '"' + mt + '":' + "{\"statistical\":{\"script\":\"(doc['avg'].value * doc['count'].value)\"},\"global\":true,\"facet_filter\":{\"fquery\":{\"query\":{\"filtered\":{\"query\":{\"query_string\":{\"query\":\""+ query + "\"}},\"filter\":{\"bool\":{\"must\":[{\"range\":{\"@timestamp\":{\"from\":"+fromtime+",\"to\":"+totime+"}}}]}}}}}}}" );
		facets.push( '"' + mt + '_total":' + "{\"statistical\":{\"field\":\"count\"},\"global\":true,\"facet_filter\":{\"fquery\":{\"query\":{\"filtered\":{\"query\":{\"query_string\":{\"query\":\""+ query + "\"}},\"filter\":{\"bool\":{\"must\":[{\"range\":{\"@timestamp\":{\"from\":"+fromtime+",\"to\":"+totime+"}}}]}}}}}}}" );
		facets.push( '"' + mt + '_failure":' + "{\"statistical\":{\"field\":\"count\"},\"global\":true,\"facet_filter\":{\"fquery\":{\"query\":{\"filtered\":{\"query\":{\"query_string\":{\"query\":\""+ query + "\"}},\"filter\":{\"bool\":{\"must\":[{\"range\":{\"@timestamp\":{\"from\":"+fromtime+",\"to\":"+totime+"}}}]}}}}}}}" );	
	} // end for
	
	// construct the query from the facet
	var  esquery = "{\"size\": 0,\"facets\":{";
		esquery += facets.join(",");
	esquery += "}}";
	
	// call es to get the results
	_es( esurl, esquery, callback );
} // end getCurrentAverages()

// creates the nodes and edges of the graph
function createNodesEdges(){
	var server   = top.gpad.performance.dashboard.hosts;	// get the selected server(s)
	var endpoints = top.gpad.performance.endpoints;		// get the endpoints
	
	// construct the host nodes
	var nodes = {};
	
	// construct the server node
	nodes[server] = { 
		name:server,
		type:"server",
		img:cpu,	
		health:"green"
	}; // end
	
	// construct the endpoint nodes
	var i = 0;
	for( var endpoint in endpoints ){
		nodes[endpoint] = {
			host: server,
			name: endpoint,
			type: "endpoint",
			img: cpu,
			health: "green",
			curavg: 0.0,
			nummetrices: endpoints[endpoint].metrics.length
		}; // end
		
		if( endpoint.toUpperCase().lastIndexOf("_DB") > -1 )
			nodes[endpoint].img = db;
		
		if( endpoint.toUpperCase().lastIndexOf("_SERVICE") > -1 )
			nodes[endpoint].img = srv;			
	} // end for
	
	// construct endpoint nodes
	var edges = {};
	
	// connect the host to endpoints
	edge = {};
	for( var endpoint in endpoints ){
		edge[endpoint] = { 
			failure:nodes[endpoint].failure 
		};
	} // end for
	edges[server]=edge;
	
	return {
		nodes:nodes,
		edges:edges
	}; // end 		
} // end createNodesEdges()