import React, { useState, useEffect } from "react";
import { Card, Input, Button, Space, List, Avatar, Skeleton, message } from "antd";
import {
  MessageOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { getPurchaseOrderActivities, createActivity } from "../../../api/procurement";

const { TextArea } = Input;

/**
 * Activity Log Sidebar Component
 * Displays timeline of activities using Ant Design
 */
const ActivityLog = ({ poId, purchaseOrder }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");

  useEffect(() => {
    loadActivities();
  }, [poId]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const response = await getPurchaseOrderActivities(poId);
      const activities = response.data || response || [];
      setActivities(Array.isArray(activities) ? activities : []);
    } catch (error) {
      console.error("Failed to load activities:", error);
      setActivities([]);
    } finally {
      setLoading(false);
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

  const getActivityIcon = (type) => {
    switch (type) {
      case "status_change":
        return <ClockCircleOutlined className="text-blue-500" />;
      case "note":
        return <FileTextOutlined className="text-green-500" />;
      case "message":
        return <MessageOutlined className="text-purple-500" />;
      default:
        return <ClockCircleOutlined className="text-gray-500" />;
    }
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
          renderItem={(activity, index) => (
            <List.Item className="!px-0 !py-2 border-b-0">
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={activity.user?.avatar}
                    style={{
                      backgroundColor: "#1890ff",
                    }}
                  >
                    {(activity.user?.name || "S").charAt(0).toUpperCase()}
                  </Avatar>
                }
                title={
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {activity.user?.name || "System"}
                    </span>
                    <span className="text-xs text-gray-400">
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
                    <div className="text-sm text-gray-700 mb-1">
                      {activity.message || activity.description || activity.type}
                    </div>
                    {activity.details && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        {activity.details}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default ActivityLog;
