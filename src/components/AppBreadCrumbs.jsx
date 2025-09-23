// components/AppBreadcrumbs.jsx
import React, { useMemo } from "react";
import { Breadcrumb } from "antd";
import { Link, useLocation } from "react-router-dom";

const defaultLabel = (seg) =>
  seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AppBreadcrumbs({
  fromLocation = true,
  path,               
  baseLabel = "Home",
  baseTo = "/",
  hide = [], 
  labelMap = {},    
}) {
  const location = useLocation();

  const pathname = fromLocation ? location.pathname : (path || "/");

  const rawSegs = pathname.split("/").filter(Boolean);


  const segs = useMemo(
    () => rawSegs.filter((s) => !hide.includes(s)),
    [rawSegs, hide]
  );

  const items = useMemo(() => {
    const acc = [];
    let full = "";
    segs.forEach((seg) => {
      full += `/${seg}`;
      const label = labelMap[seg] ?? defaultLabel(seg);
      acc.push({
        title: <Link to={full}>{label}</Link>,
      });
    });
    return acc;
  }, [segs, labelMap]);

  return (
    <Breadcrumb
      items={[
        { title: <Link to={baseTo}>{baseLabel}</Link> },
        ...items,
      ]}
    />
  );
}
