package com.gpad.service.c3dclasses.console.services;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.util.EntityUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.gpad.service.c3dclasses.console.models.MetricModel;

/**
 * PerformanceMonitorService.
 *
 */
public class PerformanceMonitorService extends ElasticClientSupport {

    /**
     * @param url
     *            .
     */
    public PerformanceMonitorService() {
        super();
    }

    /**
     * @return .
     * @throws JSONException .
     * @throws IOException . getServers .
     */
    private static List<MetricModel> metrics;

    public List<MetricModel> getMetrics(final String elasticUrl) throws JSONException, IOException {
        if (PerformanceMonitorService.metrics != null) {
            return PerformanceMonitorService.metrics;
        }
        final HttpPost post = new HttpPost(elasticUrl);
        StringBuffer buf = new StringBuffer();
        buf.append("{\"size\": 0, \"facets\" : {");
        buf.append(" \"metrics\" : {  \"terms\" : { \"field\" : \"name\", \"size\": 100 } },");
        buf.append(" \"targets\" : {  \"terms\" : { \"field\" : \"target\", \"size\": 100 } },");
        buf.append(" \"categories\" : {  \"terms\" : { \"field\" : \"category\", \"size\": 100 } }");
        buf.append("} }");
        String facets = buf.toString();

        post.addHeader("content-type", "application/x-www-form-urlencoded");
        post.setEntity(new StringEntity(facets));
        final HttpResponse rp = getHttpClient().execute(post);
        final String resultJson = EntityUtils.toString(rp.getEntity());
        final JSONObject o = new JSONObject(resultJson);
        if (o.has("error")) {
            throw new ClientProtocolException(o.getString("error"));
        }
        final JSONObject facet = o.getJSONObject("facets");
        final List<MetricModel> newmetrics = new ArrayList<>();
        final HashMap<String, MetricModel> metrichash = new HashMap<>();
        JSONObject tag = facet.getJSONObject("metrics");
        JSONArray terms = tag.getJSONArray("terms");
        for (int i = 0; i < terms.length(); i++) {
            final String term = terms.getJSONObject(i).getString("term");
            if (!metrichash.containsKey(term)) {
                final MetricModel m = new MetricModel();
                m.setName(term);
                String alias = term;
                int sindex = alias.lastIndexOf(".");
                if (sindex > -1) {
                    alias = alias.substring(0, sindex - 1);
                    sindex = alias.lastIndexOf(".");
                    if (sindex > -1) {
                        alias = term.substring(sindex + 1, term.length());
                    }
                } // end if
                m.setAlias(alias);
                metrichash.put(term, m);
            }
        }

        // get the categories
        tag = facet.getJSONObject("categories");
        terms = tag.getJSONArray("terms");
        final List<String> categories = new ArrayList<>();
        for (int i = 0; i < terms.length(); i++) {
            final String term = terms.getJSONObject(i).getString("term");
            if (categories.contains(term)) {
                continue;
            }
            categories.add(term);
        }

        // get the end-points
        tag = facet.getJSONObject("targets");
        terms = tag.getJSONArray("terms");
        final List<String> endpoints = new ArrayList<>();
        for (int i = 0; i < terms.length(); i++) {
            final String term = terms.getJSONObject(i).getString("term");
            if (endpoints.contains(term)) {
                continue;
            }
            endpoints.add(term);
        }
        buf = new StringBuffer();
        buf.append("{\"size\": 0, \"facets\" : {");
        for (int i = 0; i < endpoints.size(); i++) {
            buf.append(" \"ep_" + endpoints.get(i)
                    + "\" : {  \"terms\" : { \"field\" : \"name\", \"size\": 100 },\"global\":true,");
            buf.append("\"facet_filter\":{\"fquery\":{\"query\":{\"filtered\":{\"query\":{\"query_string\":{\"query\":\"target:"
                    + endpoints.get(i) + "\"}}}}}}}");
            if (i < endpoints.size() - 1) {
                buf.append(",");
            }
        }
        buf.append(",");
        for (int i = 0; i < categories.size(); i++) {
            buf.append(" \"ct_" + categories.get(i)
                    + "\" : {  \"terms\" : { \"field\" : \"name\", \"size\": 100 },\"global\":true,");
            buf.append("\"facet_filter\":{\"fquery\":{\"query\":{\"filtered\":{\"query\":{\"query_string\":{\"query\":\"category:"
                    + categories.get(i) + "\"}}}}}}}");
            if (i < categories.size() - 1) {
                buf.append(",");
            }
        }
        // facets += "} }";
        buf.append("} }");
        facets = buf.toString();

        post.addHeader("content-type", "application/x-www-form-urlencoded");
        post.setEntity(new StringEntity(facets));
        final HttpResponse rp2 = getHttpClient().execute(post);
        final String resultJson2 = EntityUtils.toString(rp2.getEntity());
        final JSONObject o2 = new JSONObject(resultJson2);
        if (o.has("error")) {
            throw new ClientProtocolException(o2.getString("error"));
        }
        final JSONObject facet2 = o2.getJSONObject("facets");
        for (int i = 0; i < endpoints.size(); i++) {
            tag = facet2.getJSONObject("ep_" + endpoints.get(i));
            terms = tag.getJSONArray("terms");
            for (int j = 0; j < terms.length(); j++) {
                final String term = terms.getJSONObject(j).getString("term");
                // System.out.println(endpoints.get(i) + ":" + term);
                if (metrichash.containsKey(term)) {
                    final MetricModel m = metrichash.get(term);
                    m.setEndpoint(endpoints.get(i));
                }
            }
        }
        for (int i = 0; i < categories.size(); i++) {
            tag = facet2.getJSONObject("ct_" + categories.get(i));
            terms = tag.getJSONArray("terms");
            for (int j = 0; j < terms.length(); j++) {
                final String term = terms.getJSONObject(j).getString("term");
                // System.out.println(categories.get(i) + ":" + term);
                if (metrichash.containsKey(term)) {
                    final MetricModel m = metrichash.get(term);
                    m.setCategory(categories.get(i));
                }
            }
        }
        final Object[] arr = metrichash.values().toArray();
        for (int i = 0; i < arr.length; i++) {
            newmetrics.add((MetricModel) arr[i]);
        }
        PerformanceMonitorService.metrics = newmetrics;
        return newmetrics;
    }
}
