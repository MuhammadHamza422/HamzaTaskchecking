import React, { useState, useEffect, useRef } from "react";
import { Card, Input, Button, Space, List, Avatar, Skeleton, message } from "antd";
import {
  MessageOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { getPurchaseOrderActivities, createActivity } from "../../../api/procurement";

const { TextArea } = Input;

// Simple cache for activities - cleared when component unmounts
const activitiesCache = new Map();

/**
 * Activity Log Sidebar Component
 * Displays timeline of activities using Ant Design
 */
const ActivityLog = ({ poId, purchaseOrder }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadActivities();
    return () => {
      mountedRef.current = false;
    };
  }, [poId]);

  const loadActivities = async () => {
    // Check cache first
    if (activitiesCache.has(poId)) {
      setActivities(activitiesCache.get(poId));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getPurchaseOrderActivities(poId);
      const activities = response.data || response || [];
      const activitiesArray = Array.isArray(activities) ? activities : [];
      
      // Cache the activities
      activitiesCache.set(poId, activitiesArray);
      
      if (mountedRef.current) {
        setActivities(activitiesArray);
      }
    } catch (error) {
      console.error("Failed to load activities:", error);
      if (mountedRef.current) {
        setActivities([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCreateNote = async () => {
    if (!noteMessage.trim()) {
      message.warning("Please enter a note");
      return;
    }

    try {
      await createActivity(poId, {
        type: "note",
        message: noteMessage,
      });
      message.success("Note added successfully");
      setNoteMessage("");
      setShowNoteForm(false);
      // Clear cache and reload activities
      activitiesCache.delete(poId);
      loadActivities();
    } catch (error) {
      console.error("Failed to create note:", error);
      message.error("Failed to add note");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getActivityIcon = (type, color) => {
    const iconColor = color?.primary || "#6b7280";
    const style = { color: iconColor };
    
    switch (type) {
      case "status_change":
        return <ClockCircleOutlined style={style} />;
      case "note":
        return <FileTextOutlined style={style} />;
      case "message":
        return <MessageOutlined style={style} />;
      default:
        return <ClockCircleOutlined style={style} />;
    }
  };

  // Get default colors if backend doesn't provide them
  const getDefaultColors = (type) => {
    const defaults = {
      status_change: {
        primary: "#3b82f6",
        background: "#dbeafe",
        text: "#1e40af",
        badge: "blue"
      },
      note: {
        primary: "#f59e0b",
        background: "#fef3c7",
        text: "#92400e",
        badge: "amber"
      },
      message: {
        primary: "#8b5cf6",
        background: "#ede9fe",
        text: "#5b21b6",
        badge: "purple"
      }
    };
    return defaults[type] || {
      primary: "#6b7280",
      background: "#f3f4f6",
      text: "#374151",
      badge: "gray"
    };
  };

  return (
    <Card
      size="small"
      title="Activities"
      extra={
        <Space size="small">
          <Button
            type="text"
            icon={<FileTextOutlined />}
            size="small"
            onClick={() => setShowNoteForm(!showNoteForm)}
          >
            Note
          </Button>
        </Space>
      }
    >
      {/* Note Form */}
      {showNoteForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded border">
          <TextArea
            value={noteMessage}
            onChange={(e) => setNoteMessage(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="mb-2"
          />
          <Space>
            <Button type="primary" size="small" onClick={handleCreateNote}>
              Save
            </Button>
            <Button
              size="small"
              onClick={() => {
                setShowNoteForm(false);
                setNoteMessage("");
              }}
            >
              Cancel
            </Button>
          </Space>
        </div>
      )}

      {/* Activities List */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ClockCircleOutlined className="text-3xl mb-2" />
          <p className="text-sm">No activities yet</p>
        </div>
      ) : (
        <List
          dataSource={activities}
          size="small"
          renderItem={(activity, index) => {
            // Use backend color object, fallback to defaults if not provided
            const color = activity.color || getDefaultColors(activity.type);
            const isNote = activity.type === "note";
            
            return (
              <List.Item
                className="px-1 !py-2 border-b-0"
                style={{
                  borderLeft: `3px solid ${color.primary}`,
                  backgroundColor: isNote ? color.background : "transparent",
                  borderRadius: isNote ? "8px" : "0",
                  padding: isNote ? "12px" : "8px 4px",
                  marginBottom: isNote ? "8px" : "0",
                  border: isNote ? `1px solid ${color.primary}20` : "none",
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={activity.user?.avatar}
                      style={{
                        backgroundColor: color.primary,
                        border: `2px solid ${color.primary}40`,
                      }}
                    >
                      {(activity.user?.name || "S").charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  title={
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-sm font-medium"
                        style={{ color: isNote ? color.text : "#1f2937" }}
                      >
                        {activity.user?.name || "System"}
                      </span>
                      <span 
                        className="text-xs"
                        style={{ color: isNote ? color.text : "#9ca3af" }}
                      >
                        {formatDate(
                          activity.createdAt ||
                            activity.timestamp ||
                            activity.createdDate
                        )}
                      </span>
                    </div>
                  }
                  description={
                    <div>
                      <div 
                        className="text-sm mb-1 flex items-center gap-2"
                        style={{ 
                          color: isNote ? color.text : "#374151",
                          fontWeight: isNote ? "500" : "400"
                        }}
                      >
                        <span style={{ color: color.primary, display: 'flex', alignItems: 'center' }}>
                          {getActivityIcon(activity.type, color)}
                        </span>
                        <span>{activity.message || activity.description || activity.type}</span>
                      </div>
                      {activity.details && (
                        <div 
                          className="text-xs p-2 rounded mt-2"
                          style={{
                            backgroundColor: `${color.background}80`,
                            color: color.text,
                            border: `1px solid ${color.primary}30`,
                          }}
                        >
                          {activity.details}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default ActivityLog;
