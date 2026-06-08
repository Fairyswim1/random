"use client";

import { useEffect, useState } from "react";
import { subscribeGroups } from "./gameStore";

export function useStudentGroup() {
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [groupExists, setGroupExists] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);

  useEffect(() => {
    const savedId = sessionStorage.getItem("groupId");
    const savedName = sessionStorage.getItem("groupName");
    if (savedId && savedName) {
      setGroupId(savedId);
      setGroupName(savedName);
    }
    setSessionLoaded(true);
  }, []);

  useEffect(() => {
    return subscribeGroups((groups) => {
      setGroupsLoaded(true);
      if (groupId) {
        setGroupExists(!!groups[groupId]);
      }
    });
  }, [groupId]);

  const joined = sessionLoaded && !!groupId && !!groupName && groupExists;

  return { groupId, groupName, joined, sessionLoaded, groupsLoaded };
}
