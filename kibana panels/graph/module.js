/** @scratch /panels/5
 *
 * include::panels/graph.asciidoc[]
 */

/** @scratch /panels/graph/0
 *
 * == Graph
 * Status: *Development*
 *
 * A realtime graph of the nodes generated from an elastic search query. Uses the
 * Elasticsearch terms facets to determine nodes and edges.
 *
 */
define([
        'angular',
        'app',
        'jquery',
        'lodash',
        'kgpad',
        'moment',
        './js/arbor',
        './js/arbor-tween',
        './js/arbor-graphics',
		'./js/graph'
],
function (angular, app, $, _, kgpad, moment ) {
	'use strict';
	
	var module = angular.module('kibana.panels.graph', []);
  	app.useModule(module);
 
	module.controller('graph', function($scope, querySrv, dashboard, filterSrv) {
		$scope.panelMeta = {
			modals : [
				   {
				      description: "Inspect",
				      icon: "icon-info-sign",
				      partial: "app/partials/inspector.html",
				      show: $scope.panel.spyable
				 }
			],
			status  : "Development",
      		description : "A realtime graph of the nodes generated from an elastic search query. Uses the "+
        	"Elasticsearch terms facets to determine nodes and edges."
    	}; // end $scope.panelMeta

		var _d = {
				value_last_update:0,
				value_field_threshold_other:top.gpad.performance.thresholds["other"],
				value_field_threshold_database:top.gpad.performance.thresholds["dao"],
				value_field_threshold_webservice:top.gpad.performance.thresholds["web_service"],
				value_field_avgforlastminutes:top.gpad.performance.metricavgforlastminutes
    	}; // end _d
    	
    	_.defaults($scope.panel,_d);

    	$scope.get_data = function(){ 
    		$scope.panelMeta.loading = true;
    		getCurrentAverages( $scope.panel.host, function( data ){
    			$scope.panelMeta.loading = false;
    			var d = new Date();
    		    var hh = d.getHours();
    		    var m = d.getMinutes();
    		    var s = d.getSeconds();
    			var metrics = top.gpad.performance.metrics;
    			top.gpad.performance.curtime = hh + ":" + m + ":" + s; 
    			$scope.panel.value_last_update = top.gpad.performance.curtime;
    			for( var mt in data.facets ){
					if( mt.lastIndexOf("_total") >= 0 )
						continue;
					else if( mt.lastIndexOf("_success") >= 0 )
						continue;
					else if( mt.lastIndexOf("_failure") >= 0 )	
						continue;
					var fsum = data.facets[mt];
					var ftotal = data.facets[mt + "_total"];
					var ffailure = data.facets[mt + "_failure"];
					var curavg=0;
					if( ftotal.total > 0 )
						curavg = fsum.total/ftotal.total;
					metrics[mt].curavg = curavg;
					metrics[mt].failure = ffailure.total; 
					metrics[mt].servers = $scope.panel.host;
				} // end for
				if( $scope.graph.renderer )
					$scope.graph.renderer.update( $scope.panel.host );
				$scope.$apply();
    			
			}); // end getCurrentAverages
			
    	}; // end $scope.get_data()
	
    	$scope.init = function() {
    		$scope.get_data();
		}; // end $scope.init()	
    }); // end module.controller()
	
	module.directive('graphArea', function(dashboard, filterSrv){
		return {
      		restrict: 'A',
      		
      		template: '<canvas></canvas>',
      		
      		link: function(scope, elem) {
      			var data;
					
      			scope.$on('refresh',function(){
        			scope.get_data();
      			}); // end scope.$on(refresh)
      			
      			scope.$on('render',function(event,data){
					//render_panel();
      				top.gpad.performance.thresholds["other"] = parseInt(scope.panel.value_field_threshold_other);
					top.gpad.performance.thresholds["dao"] = parseInt(scope.panel.value_field_threshold_database);
					top.gpad.performance.thresholds["web_service"] = parseInt(scope.panel.value_field_threshold_webservice);
					top.gpad.performance.metricavgforlastminutes = parseInt(scope.panel.value_field_avgforlastminutes);
					
      				if( scope.graph.renderer )
    					scope.graph.renderer.update( scope.panel.host );
				}); // end scope.$on(render)
				
      			function render_panel() {
					try { 
						elem.css({height:scope.panel.height||scope.row.height});
					} catch(e) {return;}
					// populate element
					
					try{
						var options={ 
						}; // end options						
					} // end try
					catch(e){
						return;
					} // end catch
					
					
					//4000, 500, 0.5, 55
					// create the graph
					scope.elem = elem;
					//scope.graph = arbor.ParticleSystem(0, 0, .5, 55, .02, true);
					//scope.graph = arbor.ParticleSystem({ stiffness:0, repulsion:0, gravity:false, dt:0.015 });
					//scope.graph.renderer = Renderer(scope.elem);
					//scope.graph.graft(createNodesEdges());
					var options = { stiffness:0, repulsion:2000, gravity:false, dt:0.015 };
					scope.graph = createGraph( scope.elem, options );
				}; // end render_panel()
				
				render_panel();
			} // end link: function()
		}; // end return
	}); // end module.directive()
}); // end function()
