import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Group, CreateGroupData, UpdateGroupData, GroupStoreState, GroupColors, GroupColor } from '../types/groups';

interface GroupStoreActions {
  // Group actions
  createGroup: (data: CreateGroupData) => Group; // for internal use only
  updateGroup: (id: string, data: UpdateGroupData) => void;
  deleteGroup: (id: string) => void;
  
  // Group selection
  selectGroup: (groupId: string | undefined) => void;
  
  // Data retrieval
  getGroupById: (id: string) => Group | undefined;
  setTradingPair: (groupId: string, tradingPair: string | undefined) => void;
  setAccount: (groupId: string, account: string | undefined) => void;
  setExchange: (groupId: string, exchange: string | undefined) => void;
  setMarket: (groupId: string, market: string | undefined) => void;
  resetGroup: (groupId: string) => void;
  
  // Test data initialization
  initializeDefaultGroups: () => void;
}

type GroupStore = GroupStoreState & GroupStoreActions;

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      // Initial state
      groups: [],
      selectedGroupId: undefined,
      
      // Create group
      createGroup: (data: CreateGroupData) => {
        const newGroup: Group = {
          ...data,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          groups: [...state.groups, newGroup]
        }));
        
        return newGroup;
      },
      
      // Update group
      updateGroup: (id: string, data: UpdateGroupData) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === id
              ? { ...group, ...data, updatedAt: new Date().toISOString() }
              : group
          )
        }));
      },
      
      // Delete group
      deleteGroup: (id: string) => {
        set((state) => ({
          groups: state.groups.filter(group => group.id !== id),
          selectedGroupId: state.selectedGroupId === id ? undefined : state.selectedGroupId
        }));
      },
      
      // Select group
      selectGroup: (groupId: string | undefined) => {
        set({ selectedGroupId: groupId });
      },
      
      // Get group by ID
      getGroupById: (id: string) => {
        return get().groups.find(group => group.id === id);
      },
      
      // Set trading pair for group
      setTradingPair: (groupId: string, tradingPair: string | undefined) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { ...group, tradingPair, updatedAt: new Date().toISOString() }
              : group
          )
        }));
      },

      // Set account for group
      setAccount: (groupId: string, account: string | undefined) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { ...group, account, updatedAt: new Date().toISOString() }
              : group
          )
        }));
      },

      // Set exchange for group
      setExchange: (groupId: string, exchange: string | undefined) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { ...group, exchange, updatedAt: new Date().toISOString() }
              : group
          )
        }));
      },

      // Set market for group
      setMarket: (groupId: string, market: string | undefined) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { ...group, market, updatedAt: new Date().toISOString() }
              : group
          )
        }));
      },

      // Reset group settings
      resetGroup: (groupId: string) => {
        set((state) => ({
          groups: state.groups.map(group =>
            group.id === groupId
              ? { 
                  ...group, 
                  account: undefined, 
                  exchange: undefined, 
                  market: undefined,
                  tradingPair: undefined, 
                  updatedAt: new Date().toISOString() 
                }
              : group
          )
        }));
      },
      
      // Initialize test data
      initializeDefaultGroups: () => {
        const { groups } = get();
        if (groups.length === 0) {
          const defaultGroups: CreateGroupData[] = [
            { name: 'Transparent', color: 'transparent' }, // transparent group by default
            { name: 'Cyan', color: '#00BCD4' },
            { name: 'Red', color: '#F44336' },
            { name: 'Purple', color: '#9C27B0' },
            { name: 'Blue', color: '#2196F3' },
            { name: 'Green', color: '#4CAF50' },
            { name: 'Orange', color: '#FF9800' },
            { name: 'Pink', color: '#E91E63' },
          ];
          
          defaultGroups.forEach(groupData => {
            get().createGroup(groupData);
          });
        }
      },
    }),
    {
      name: 'group-store',
      version: 2,
    }
  )
); 