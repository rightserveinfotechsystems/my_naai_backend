const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Bookmark = sequelize.define('Bookmark', {
        bookmarkId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'bookmark_id'
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'user_id'
            },
            onDelete: 'CASCADE'
        },
        salonId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'salon_id',
            references: {
                model: 'salons',
                key: 'salon_id'
            },
            onDelete: 'CASCADE'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'updated_at'
        }
    }, {
        sequelize,
        modelName: 'Bookmark',
        tableName: 'bookmarks',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'salon_id'] // prevent duplicate bookmarks
            },
            { fields: ['user_id'] },
            { fields: ['salon_id'] }
        ]
    });

    Bookmark.associate = (models) => {
        Bookmark.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        Bookmark.belongsTo(models.Salon, {
            foreignKey: 'salonId',
            as: 'salon'
        });
    };

    return Bookmark;
};

