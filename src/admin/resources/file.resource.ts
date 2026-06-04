import type { ActionContext, ResourceWithOptions } from 'adminjs' with { 'resolution-mode': 'import' };
import { File } from '../../modules/file/entities/file.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';

const isAdmin = ({ currentAdmin }: ActionContext): boolean =>
  currentAdmin?.role === UserRole.ADMIN;

export const FileResource: ResourceWithOptions = {
  resource: File,
  options: {
    navigation: { name: 'Media', icon: 'Image' },
    listProperties: ['id', 'url', 'createdAt'],
    showProperties: ['id', 'url', 'createdAt'],
    editProperties: [],
    filterProperties: ['url', 'createdAt'],
    actions: {
      list: { isAccessible: isAdmin },
      show: { isAccessible: isAdmin },
      new: { isVisible: false },
      edit: { isVisible: false },
      delete: { isVisible: false },
      bulkDelete: { isVisible: false },
    },
  },
};
