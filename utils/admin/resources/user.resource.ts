import type { ActionContext, ResourceWithOptions } from 'adminjs' with { 'resolution-mode': 'import' };
import { User } from 'src/modules/users/entities/user.entity';
import { UserRole } from 'src/modules/users/enums/user-role.enum';

const isAdmin = ({ currentAdmin }: ActionContext): boolean =>
  currentAdmin?.role === UserRole.ADMIN;

export const UserResource: ResourceWithOptions = {
  resource: User,
  options: {
    navigation: { name: 'Access', icon: 'User' },
    listProperties: ['id', 'name', 'mobile', 'role', 'createdAt'],
    showProperties: ['id', 'name', 'mobile', 'role', 'createdAt', 'updatedAt'],
    editProperties: ['name', 'mobile', 'role'],
    filterProperties: ['name', 'mobile', 'role', 'createdAt'],
    properties: {
      password: { isVisible: false },
      createdBy: { isVisible: false },
      updatedBy: { isVisible: false },
      deletedBy: { isVisible: false },
      recoveredBy: { isVisible: false },
      recoveredAt: { isVisible: false },
      deletedAt: { isVisible: false },
      role: {
        availableValues: [
          { value: 'USER', label: 'User' },
          { value: 'ADMIN', label: 'Admin' },
        ],
      },
    },
    actions: {
      list: { isAccessible: isAdmin },
      show: { isAccessible: isAdmin },
      new: { isAccessible: isAdmin },
      edit: { isAccessible: isAdmin },
      delete: { isVisible: false },
      bulkDelete: { isVisible: false },
    },
  },
};
