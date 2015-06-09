package com.gpad.service.c3dclasses.console.controllers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.gpad.service.c3dclasses.console.models.AjaxResultWrapper;
import com.gpad.service.c3dclasses.console.models.MetricModel;
import com.gpad.service.c3dclasses.console.services.PerformanceMonitorService;
import com.gpad.service.c3dclasses.console.utilities.Commons;

@org.springframework.stereotype.Controller
public class PerformanceMonitorController {
    @Autowired
    private PerformanceMonitorService performanceMonitorService;
    @Autowired
    private Commons commons;

    /**
     * @param host
     *            .
     * @return getServers result
     */
    @SuppressWarnings("rawtypes")
    @RequestMapping(value = "performance/metrics", method = RequestMethod.GET)
    @ResponseBody
    public AjaxResultWrapper getMetrics() {
        try {
            List<MetricModel> resList;
            resList = performanceMonitorService.getMetrics(commons.constructPerformanceMonitorIndexUrl());
            return AjaxResultWrapper.ok(resList);
        } catch (final Exception e) {
            // Using Map is a cool way of creating a dynamic object since javascript will deserialize Map Json into a
            // dynamic object
            final Map<String, String> resMap = new HashMap<String, String>();
            resMap.put("error", "Can not contact the server, reason: " + e.getMessage());
            return AjaxResultWrapper.ok(resMap);
        }
    }
}
